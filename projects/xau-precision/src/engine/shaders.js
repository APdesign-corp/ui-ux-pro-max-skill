// Shaders de post-production.
//  FXComposite  : ajoute le calque lumineux 2D (lignes SVG, particules, HUD) en HDR,
//                 avant le bloom, pour qu'il "brille" réellement.
//  Final        : aberration chromatique, flou de mouvement directionnel et radial,
//                 onde de distorsion, glitch contrôlé, calque typographique net,
//                 scanlines, vignette, flash, grain, fondu.

export const FXCompositeShader = {
  uniforms: {
    tDiffuse: { value: null },
    tFX: { value: null },
    uGain: { value: 1.3 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform sampler2D tFX; uniform float uGain;
    varying vec2 vUv;
    void main(){
      vec3 base = texture2D(tDiffuse, vUv).rgb;
      // anti-"fireflies" : un reflet spéculaire HDR extrême sur un sous-pixel ferait
      // exploser le bloom sur toute l'image -> on plafonne l'énergie (et on écarte les NaN)
      if (any(isnan(base)) || any(isinf(base))) base = vec3(0.0);
      float m = max(base.r, max(base.g, base.b));
      base *= min(1.0, 4.0 / max(m, 1e-4));
      vec4 fx = texture2D(tFX, vUv);           // prémultiplié, décodé sRGB -> linéaire
      gl_FragColor = vec4(base + fx.rgb * uGain, 1.0);
    }`,
};

export const FinalShader = {
  uniforms: {
    tDiffuse: { value: null },
    tUI: { value: null },
    uRes: { value: [1, 1] },
    uTime: { value: 0 },
    uCA: { value: 0.001 },
    uBlur: { value: [0, 0] },
    uZoomBlur: { value: 0 },
    uZoomCenter: { value: [0.5, 0.5] },
    uRollBlur: { value: 0 },
    uRGB: { value: 0 },
    uEdgeBlur: { value: 0 },
    uShock: { value: [0.5, 0.5, -1, 0] },  // centre xy, rayon, force
    uGlitch: { value: 0 },
    uScan: { value: 0.03 },
    uVignette: { value: 0.9 },
    uFlash: { value: 0 },
    uFlashColor: { value: [1, 1, 1] },
    uGrain: { value: 0.035 },
    uFade: { value: 1 },
    uUIBlur: { value: 1 },
  },
  vertexShader: FXCompositeShader.vertexShader,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform sampler2D tUI;
    uniform vec2 uRes; uniform float uTime; uniform float uCA;
    uniform vec2 uBlur; uniform float uZoomBlur; uniform vec2 uZoomCenter; uniform float uRollBlur;
    uniform float uRGB; uniform float uEdgeBlur;
    uniform vec4 uShock; uniform float uGlitch; uniform float uScan; uniform float uVignette;
    uniform float uFlash; uniform vec3 uFlashColor; uniform float uGrain; uniform float uFade; uniform float uUIBlur;
    varying vec2 vUv;

    float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }

    vec3 sceneCA(vec2 uv){
      vec2 d = uv - 0.5;
      vec2 off = d * uCA * (1.0 + dot(d,d)*4.0) + vec2(uRGB, 0.0);
      return vec3(texture2D(tDiffuse, uv + off).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - off).b);
    }
    vec2 rot2(vec2 p, float a){ float c = cos(a), s = sin(a); return vec2(c*p.x - s*p.y, s*p.x + c*p.y); }

    void main(){
      vec2 uv = vUv;
      float aspect = uRes.x / uRes.y;

      // Onde de choc : distorsion radiale fine autour d'un anneau qui s'étend
      if (uShock.z > 0.0) {
        vec2 dv = (uv - uShock.xy) * vec2(aspect, 1.0);
        float dist = length(dv);
        float ring = exp(-pow((dist - uShock.z) * 28.0, 2.0));
        uv -= normalize(dv + 1e-5) / vec2(aspect, 1.0) * ring * uShock.w * 0.03;
      }

      // Glitch contrôlé : quelques bandes horizontales décalées, rarement
      if (uGlitch > 0.001) {
        float band = floor(uv.y * 54.0);
        float h = hash(vec2(band, floor(uTime * 30.0)));
        if (h > 1.0 - uGlitch * 0.28) uv.x += (hash(vec2(band, 7.0)) - 0.5) * 0.05 * uGlitch;
      }

      vec3 col = vec3(0.0);
      vec4 ui = vec4(0.0);
      float blurAmt = length(uBlur) + uZoomBlur + abs(uRollBlur);
      if (blurAmt > 0.0004) {
        const int N = 22;
        for (int i = 0; i < N; i++) {
          float k = float(i) / float(N - 1) - 0.5;
          vec2 rc = (uv - uZoomCenter) * vec2(aspect, 1.0);
          vec2 rr = (rot2(rc, uRollBlur * k) - rc) / vec2(aspect, 1.0);
          vec2 o = uBlur * k + (uv - uZoomCenter) * uZoomBlur * k + rr;
          col += sceneCA(uv + o);
          ui += texture2D(tUI, uv + o * uUIBlur);
        }
        col /= float(N); ui /= float(N);
      } else {
        col = sceneCA(uv);
        ui = texture2D(tUI, uv);
      }

      // flou de lentille sur les bords (anamorphose douce des coins)
      if (uEdgeBlur > 0.001) {
        vec2 ed = (vUv - 0.5) * vec2(aspect, 1.0) / max(aspect, 1.0);
        float e = smoothstep(0.32, 0.75, length(ed)) * uEdgeBlur;
        if (e > 0.01) {
          vec3 acc = vec3(0.0);
          float r = e * 0.006;
          for (int i = 0; i < 8; i++) {
            float a = float(i) * 0.785398;
            acc += sceneCA(uv + vec2(cos(a), sin(a) * aspect) * r);
          }
          col = mix(col, acc / 8.0, clamp(e * 1.2, 0.0, 1.0));
        }
      }

      // séparation RGB du calque typo pendant les glitchs
      if (uRGB > 0.0005) {
        ui.r = texture2D(tUI, uv + vec2(uRGB * 1.4, 0.0)).r;
        ui.b = texture2D(tUI, uv - vec2(uRGB * 1.4, 0.0)).b;
      }

      // Aberration chromatique légère sur la typo aussi (uniquement lors des impacts)
      if (uCA > 0.002) {
        vec2 d = uv - 0.5; vec2 off = d * (uCA - 0.002) * 1.5;
        ui.r = mix(ui.r, texture2D(tUI, uv + off).r, 0.8);
        ui.b = mix(ui.b, texture2D(tUI, uv - off).b, 0.8);
      }

      col = col * (1.0 - ui.a) + ui.rgb;   // calque typo prémultiplié

      // scanlines très subtiles
      col *= 1.0 - uScan * (0.5 + 0.5 * sin(uv.y * uRes.y * 1.5708));

      // vignette
      vec2 vd = (vUv - 0.5) * vec2(aspect, 1.0) / max(aspect, 1.0);
      float v = smoothstep(0.85, 0.2, length(vd) * 1.05);
      col *= mix(1.0, v, uVignette * 0.75);

      // flash cinématique
      col += uFlashColor * uFlash;

      // grain
      float n = hash(vUv * uRes + fract(uTime * 13.7) * 311.0) - 0.5;
      col += n * uGrain;

      gl_FragColor = vec4(clamp(col, 0.0, 1.0) * uFade, 1.0);
    }`,
};

// Fond de studio : dégradé radial vert très sombre + grille du site en perspective (sol).
export const BackdropShader = {
  uniforms: {
    uBg: { value: null },
    uGlow: { value: null },
    uGlow2: { value: null },
    uCenter: { value: [0.5, 0.56] },
    uIntensity: { value: 1 },
    uTime: { value: 0 },
    uRes: { value: [1920, 1080] },
  },
  vertexShader: FXCompositeShader.vertexShader,
  fragmentShader: /* glsl */ `
    uniform vec3 uBg; uniform vec3 uGlow; uniform vec3 uGlow2; uniform vec2 uCenter; uniform float uIntensity; uniform float uTime;
    uniform vec2 uRes;
    varying vec2 vUv;
    void main(){
      // halo en espace écran (indépendant de la taille du plan et de la focale)
      vec2 uv = gl_FragCoord.xy / uRes;
      float ar = uRes.x / uRes.y;
      vec2 p = uv - uCenter; p.x *= ar / max(ar, 1.0) * 1.0; p.y /= max(1.0 / ar, 1.0);
      float d2 = dot(p, p);
      vec3 c = uBg;
      c += uGlow * uIntensity * (exp(-d2 * 4.0) * 0.022 + exp(-d2 * 22.0) * 0.03);
      vec2 p2 = uv - vec2(0.85, 0.82); p2.x *= ar / max(ar, 1.0);
      c += uGlow2 * uIntensity * exp(-dot(p2, p2) * 6.0) * 0.012;
      gl_FragColor = vec4(c, 1.0);
    }`,
};

export const GridFloorShader = {
  uniforms: { uColor: { value: null }, uOpacity: { value: 0.5 }, uTime: { value: 0 } },
  vertexShader: /* glsl */ `
    varying vec2 vUv; varying vec3 vW;
    void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: /* glsl */ `
    uniform vec3 uColor; uniform float uOpacity; uniform float uTime;
    varying vec2 vUv; varying vec3 vW;
    void main(){
      vec2 g = vW.xz * 2.0;
      vec2 f = abs(fract(g - 0.5) - 0.5) / fwidth(g);
      float l = 1.0 - min(min(f.x, f.y), 1.0);
      float fade = exp(-length(vW.xz) * 0.22);
      float a = l * fade * uOpacity;
      gl_FragColor = vec4(uColor * a, 1.0);
    }`,
};

// Faisceau volumétrique additif (cône) : intensité selon l'angle de vue et la hauteur
export const BeamShader = {
  uniforms: { uColor: { value: null }, uIntensity: { value: 1 } },
  vertexShader: /* glsl */ `
    varying vec2 vUv; varying vec3 vN; varying vec3 vV;
    void main(){
      vUv = uv;
      vec4 mv = modelViewMatrix * vec4(position,1.0);
      vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: /* glsl */ `
    uniform vec3 uColor; uniform float uIntensity;
    varying vec2 vUv; varying vec3 vN; varying vec3 vV;
    void main(){
      float facing = pow(abs(dot(vN, vV)), 2.5);
      float along = pow(vUv.y, 1.6);
      float a = facing * along * uIntensity;
      gl_FragColor = vec4(uColor * a, 1.0);
    }`,
};

// Particules 3D (poussière + motes vertes), animées dans le vertex shader par uTime
export const ParticleShader = {
  uniforms: {
    uTime: { value: 0 },
    uSize: { value: 1 },
    uColor: { value: null },
    uOpacity: { value: 1 },
    uBox: { value: [10, 6, 10] },
    uDrift: { value: [0.05, 0.12, 0.03] },
    uPixel: { value: 1 },
  },
  vertexShader: /* glsl */ `
    uniform float uTime; uniform float uSize; uniform vec3 uBox; uniform vec3 uDrift; uniform float uPixel;
    attribute float aSeed;
    varying float vA;
    void main(){
      vec3 p = position;
      p += uDrift * uTime * (0.5 + aSeed);
      p.x += sin(uTime * 0.7 + aSeed * 40.0) * 0.08;
      p.z += cos(uTime * 0.5 + aSeed * 23.0) * 0.08;
      p = mod(p + uBox * 0.5, uBox) - uBox * 0.5;
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mv;
      float tw = 0.55 + 0.45 * sin(uTime * (1.5 + aSeed * 3.0) + aSeed * 60.0);
      vA = tw;
      gl_PointSize = uSize * uPixel * (0.4 + aSeed) / max(0.5, -mv.z);
    }`,
  fragmentShader: /* glsl */ `
    uniform vec3 uColor; uniform float uOpacity;
    varying float vA;
    void main(){
      vec2 c = gl_PointCoord - 0.5;
      float d = dot(c, c) * 4.0;
      float a = exp(-d * 4.0) * vA * uOpacity;
      gl_FragColor = vec4(uColor * a, 1.0);
    }`,
};

// Carte du monde en points : révélation radiale depuis Liège + front lumineux
export const MapShader = {
  uniforms: {
    tDots: { value: null },
    uReveal: { value: 0 },
    uOrigin: { value: [0.5, 0.5] },
    uColor: { value: null },
    uHot: { value: null },
    uOpacity: { value: 1 },
    uTime: { value: 0 },
  },
  vertexShader: FXCompositeShader.vertexShader,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDots; uniform float uReveal; uniform vec2 uOrigin; uniform vec3 uColor; uniform vec3 uHot;
    uniform float uOpacity; uniform float uTime;
    varying vec2 vUv;
    void main(){
      vec4 t = texture2D(tDots, vUv);
      vec2 d = (vUv - uOrigin) * vec2(2.0, 1.0);
      float dist = length(d);
      float shown = smoothstep(uReveal, uReveal - 0.08, dist);
      float front = exp(-pow((dist - uReveal) * 18.0, 2.0));
      float pulse = 0.5 + 0.5 * sin(dist * 40.0 - uTime * 6.0);
      vec3 c = uColor * t.r * (0.55 + 0.15 * pulse) + uHot * t.r * front * 2.5;
      float a = t.r * (shown + front) * uOpacity;
      gl_FragColor = vec4(c * a, 1.0);
    }`,
};
