export interface ChromaKeySettings {
  enabled: boolean;
  /** 0 a 100: cuánto verde se elimina */
  tolerance: number;
  /** 0 a 100: suavizado del borde / anti-halo */
  smoothness: number;
}

export type ChromaKeyFit = 'contain' | 'cover';

const VERTEX_SHADER = `
attribute vec2 a_position;
attribute vec2 a_texCoord;
varying vec2 v_texCoord;
void main() {
  v_texCoord = a_texCoord;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

// Keying por "dominancia de verde" + supresión de derrame (anti-halo).
// No usa getImageData: todo ocurre en GPU, así que no hay lag por CPU.
//
// u_low/u_high: umbral de "cuánto verde" se elimina (más bajo = más agresivo)
// u_spill: fuerza con la que se quita el verde sobrante de los bordes
const FRAGMENT_SHADER = `
precision mediump float;
varying vec2 v_texCoord;

uniform sampler2D u_texture;
uniform float u_keyEnabled;
uniform float u_low;
uniform float u_high;
uniform float u_spill;

void main() {
  vec4 texel = texture2D(u_texture, v_texCoord);

  if (u_keyEnabled < 0.5) {
    gl_FragColor = vec4(texel.rgb, 1.0);
    return;
  }

  float maxRB = max(texel.r, texel.b);
  float greenness = texel.g - maxRB;
  float alpha = 1.0 - smoothstep(u_low, u_high, greenness);

  // Recorta el verde sobrante en bordes y zonas semitransparentes.
  float spillAmount = smoothstep(0.0, u_high, greenness) * u_spill;
  float despilledGreen = mix(texel.g, min(texel.g, maxRB), spillAmount);

  gl_FragColor = vec4(texel.r, despilledGreen, texel.b, alpha);
}
`;

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

/**
 * Renderizador compartido de chroma key (WebGL) usado por el susto real y por la vista previa,
 * para que ambos se vean exactamente igual.
 */
export class ChromaKeyRenderer {
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private buffer: WebGLBuffer | null = null;
  private texture: WebGLTexture | null = null;
  private uniforms: {
    keyEnabled: WebGLUniformLocation | null;
    low: WebGLUniformLocation | null;
    high: WebGLUniformLocation | null;
    spill: WebGLUniformLocation | null;
  } = { keyEnabled: null, low: null, high: null, spill: null };

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: false,
      antialias: false,
      depth: false,
      stencil: false,
    });

    if (!gl) return;

    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

    const buffer = gl.createBuffer();
    const texture = gl.createTexture();
    if (!buffer || !texture) return;

    gl.useProgram(program);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    const positionLocation = gl.getAttribLocation(program, 'a_position');
    const texCoordLocation = gl.getAttribLocation(program, 'a_texCoord');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(texCoordLocation);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 16, 8);

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    // Sin flip: la primera fila de la textura es la parte superior del vídeo.
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

    gl.uniform1i(gl.getUniformLocation(program, 'u_texture'), 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    this.gl = gl;
    this.program = program;
    this.buffer = buffer;
    this.texture = texture;
    this.uniforms = {
      keyEnabled: gl.getUniformLocation(program, 'u_keyEnabled'),
      low: gl.getUniformLocation(program, 'u_low'),
      high: gl.getUniformLocation(program, 'u_high'),
      spill: gl.getUniformLocation(program, 'u_spill'),
    };
  }

  get isReady(): boolean {
    return Boolean(this.gl && this.program);
  }

  render(video: HTMLVideoElement, settings: ChromaKeySettings, fit: ChromaKeyFit = 'contain'): void {
    const gl = this.gl;
    const canvas = gl ? gl.canvas : null;

    if (!gl || !canvas || !this.buffer || !this.texture) return;
    if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) return;

    const canvasElement = canvas as HTMLCanvasElement;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(canvasElement.clientWidth * dpr));
    const height = Math.max(1, Math.round(canvasElement.clientHeight * dpr));

    if (canvasElement.width !== width || canvasElement.height !== height) {
      canvasElement.width = width;
      canvasElement.height = height;
    }

    gl.viewport(0, 0, width, height);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const canvasAspect = width / height;
    const videoAspect = video.videoWidth / video.videoHeight;
    const widerThanCanvas = videoAspect > canvasAspect;

    let scaleX = 1;
    let scaleY = 1;

    if (fit === 'contain') {
      if (widerThanCanvas) scaleY = canvasAspect / videoAspect;
      else scaleX = videoAspect / canvasAspect;
    } else if (widerThanCanvas) {
      scaleX = videoAspect / canvasAspect;
    } else {
      scaleY = canvasAspect / videoAspect;
    }

    const vertices = new Float32Array([
      -scaleX, -scaleY, 0, 1,
      scaleX, -scaleY, 1, 1,
      -scaleX, scaleY, 0, 0,
      scaleX, scaleY, 1, 0,
    ]);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);

    const tolerance = Math.min(100, Math.max(0, settings.tolerance));
    const smoothness = Math.min(100, Math.max(0, settings.smoothness));
    // Más tolerancia = umbral más bajo = quita más verde.
    // 0 % deja el fondo casi intacto; ~40 % limpia el verde típico; 100 % también come bordes.
    const keyLow = 0.9 * Math.pow(1 - tolerance / 100, 2.2);
    const keyHigh = keyLow + 0.02 + (smoothness / 100) * 0.3;

    gl.uniform1f(this.uniforms.keyEnabled, settings.enabled ? 1 : 0);
    gl.uniform1f(this.uniforms.low, keyLow);
    gl.uniform1f(this.uniforms.high, keyHigh);
    gl.uniform1f(this.uniforms.spill, 0.75 + 0.25 * (smoothness / 100));

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  dispose(): void {
    const gl = this.gl;
    if (!gl) return;

    if (this.buffer) gl.deleteBuffer(this.buffer);
    if (this.texture) gl.deleteTexture(this.texture);
    if (this.program) gl.deleteProgram(this.program);

    this.gl = null;
    this.program = null;
    this.buffer = null;
    this.texture = null;
  }
}
