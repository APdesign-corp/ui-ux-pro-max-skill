// Moteur de rendu : Three.js (3D PBR) + deux calques Canvas 2D (lumière / typographie)
// + chaîne de post-production. Rendu image par image, piloté par renderFrame(t).
//
//   Scène 3D ─► [DOF Bokeh] ─► + calque FX 2D (HDR) ─► Bloom ─► Tone mapping/sRGB
//            ─► Final : CA, motion blur, onde, glitch, + calque typo net, scanlines,
//                       vignette, flash, grain

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { FXAAPass } from 'three/addons/postprocessing/FXAAPass.js';
import { FXCompositeShader, FinalShader } from './shaders.js';

export class Engine {
  constructor(canvas, cfg) {
    const { width: W, height: H } = cfg.video;
    this.cfg = cfg;
    this.W = W;
    this.H = H;
    const r = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    r.setPixelRatio(1);
    r.setSize(W, H, false);
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.NeutralToneMapping;
    r.toneMappingExposure = 1.0;
    r.setClearColor(new THREE.Color(cfg.colors.bg), 1);
    this.renderer = r;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, W / H, 0.05, 300);

    // Calques 2D
    const mk = () => {
      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      return c;
    };
    this.fxCanvas = mk();
    this.uiCanvas = mk();
    this.fx = this.fxCanvas.getContext('2d');
    this.ui = this.uiCanvas.getContext('2d');
    const tex = (c, srgb) => {
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.premultiplyAlpha = true;
      t.generateMipmaps = false;
      t.minFilter = THREE.LinearFilter;
      t.magFilter = THREE.LinearFilter;
      return t;
    };
    this.fxTex = tex(this.fxCanvas, true);
    this.uiTex = tex(this.uiCanvas, false);

    // Post-production
    const rt = new THREE.WebGLRenderTarget(W, H, {
      type: THREE.HalfFloatType,
      samples: cfg.vfx.msaa || 0,
    });
    const composer = new EffectComposer(r, rt);
    composer.setPixelRatio(1);
    composer.setSize(W, H);
    this.renderPass = new RenderPass(this.scene, this.camera);
    composer.addPass(this.renderPass);

    this.bokeh = new BokehPass(this.scene, this.camera, { focus: 5, aperture: 0.0, maxblur: 0.006 });
    this.bokeh.enabled = false;
    composer.addPass(this.bokeh);

    this.fxPass = new ShaderPass(FXCompositeShader);
    this.fxPass.uniforms.tFX.value = this.fxTex;
    composer.addPass(this.fxPass);

    const b = cfg.vfx.bloom;
    this.bloom = new UnrealBloomPass(new THREE.Vector2(W, H), b.strength, b.radius, b.threshold);
    composer.addPass(this.bloom);

    composer.addPass(new OutputPass());
    if (cfg.vfx.fxaa) composer.addPass(new FXAAPass());

    this.finalPass = new ShaderPass(FinalShader);
    this.finalPass.uniforms.tUI.value = this.uiTex;
    this.finalPass.uniforms.uRes.value = [W, H];
    composer.addPass(this.finalPass);
    this.composer = composer;
  }

  clear2D() {
    for (const g of [this.fx, this.ui]) {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
      g.setLineDash([]);
      g.filter = 'none';
      g.clearRect(0, 0, this.W, this.H);
    }
  }

  // Valeurs de post-production par défaut de chaque image (les scènes les modulent)
  defaultPost() {
    const v = this.cfg.vfx;
    return {
      ca: v.chromatic,
      blur: [0, 0],
      zoomBlur: 0,
      zoomCenter: [0.5, 0.5],
      shock: [0.5, 0.5, -1, 0],
      glitch: 0,
      scan: v.scanlines,
      vignette: v.vignette,
      flash: 0,
      flashColor: [0.85, 1, 0.85],
      grain: v.grain,
      fade: 1,
      bloom: v.bloom.strength,
      bloomRadius: v.bloom.radius,
      fxGain: v.fxGain,
      exposure: 1,
      dof: null, // { focus, aperture, maxblur }
      uiBlur: 1,
    };
  }

  render(post, time) {
    const k = this.cfg.vfx.intensity;
    const mb = this.cfg.vfx.motionBlur;
    const u = this.finalPass.uniforms;
    u.uTime.value = time;
    u.uCA.value = post.ca * k;
    u.uBlur.value = [post.blur[0] * mb, post.blur[1] * mb];
    u.uZoomBlur.value = post.zoomBlur * mb;
    u.uZoomCenter.value = post.zoomCenter;
    u.uShock.value = [post.shock[0], post.shock[1], post.shock[2], post.shock[3] * k];
    u.uGlitch.value = post.glitch * this.cfg.vfx.glitch * k;
    u.uScan.value = post.scan;
    u.uVignette.value = post.vignette;
    u.uFlash.value = Math.min(1, post.flash * k);
    u.uFlashColor.value = post.flashColor;
    u.uGrain.value = post.grain;
    u.uFade.value = post.fade;
    u.uUIBlur.value = post.uiBlur;
    this.fxPass.uniforms.uGain.value = post.fxGain;
    this.bloom.strength = post.bloom * (0.6 + 0.4 * k);
    this.bloom.radius = post.bloomRadius;
    this.renderer.toneMappingExposure = post.exposure;
    if (post.dof && this.cfg.vfx.dof) {
      this.bokeh.enabled = true;
      const bu = this.bokeh.uniforms;
      bu.focus.value = post.dof.focus;
      bu.aperture.value = post.dof.aperture;
      bu.maxblur.value = post.dof.maxblur ?? 0.006;
    } else {
      this.bokeh.enabled = false;
    }
    this.fxTex.needsUpdate = true;
    this.uiTex.needsUpdate = true;
    this.composer.render();
  }
}
