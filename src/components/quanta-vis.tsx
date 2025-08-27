
"use client";

import React, { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SimplexNoise } from 'three/examples/jsm/math/SimplexNoise.js';

const QuantaVis: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const mousePosition = useRef(new THREE.Vector2(10000, 10000));

  useEffect(() => {
    if (!mountRef.current) return;

    const currentMount = mountRef.current;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0f1e, 0.02);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 70;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.autoClear = false;

    currentMount.appendChild(renderer.domElement);
    
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.8, 0.2, 0.1);
    const composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    const fadeMaterial = new THREE.MeshBasicMaterial({
      color: 0x0a0f1e,
      transparent: true,
      opacity: 0.1
    });
    const fadePlane = new THREE.PlaneGeometry(1, 1);
    const fadeMesh = new THREE.Mesh(fadePlane, fadeMaterial);
    fadeMesh.position.z = -100;
    fadeMesh.renderOrder = -1;
    const fadeScene = new THREE.Scene();
    const fadeCamera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, -1000, 1000);
    fadeScene.add(fadeMesh);

    const particleCount = 5000;
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const baseColors = new Float32Array(particleCount * 3);
    const scales = new Float32Array(particleCount);

    const colorPalette = [new THREE.Color(0xffffff), new THREE.Color(0x7DD3FC), new THREE.Color(0xADD8E6)];
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 100;
      positions[i3 + 1] = (Math.random() - 0.5) * 100;
      const skewedRandom = Math.pow(Math.random(), 2);
      positions[i3 + 2] = (skewedRandom - 0.5) * 60 - 30;

      const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      baseColors[i3] = color.r;
      baseColors[i3 + 1] = color.g;
      baseColors[i3 + 2] = color.b;

      scales[i] = Math.random() * 1.5 + 0.5;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('baseColor', new THREE.BufferAttribute(baseColors, 3));
    geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1));
    
    const material = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 1.0 },
            mousePos: { value: new THREE.Vector3(10000, 10000, 0) },
            viewport: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
        },
        vertexShader: `
            attribute float scale;
            attribute vec3 baseColor;
            
            uniform vec3 mousePos;
            uniform vec2 viewport;

            varying vec3 vBaseColor;
            varying float vMouseDist;

            void main() {
                vBaseColor = baseColor;
                
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                vec4 projected = projectionMatrix * mvPosition;
                projected.xyz /= projected.w; // perspective divide

                // Convert mouse from normalized device coordinates to screen pixels
                vec2 mouseScreenPos = vec2((mousePos.x + 1.0) * 0.5 * viewport.x, (mousePos.y + 1.0) * 0.5 * viewport.y);
                
                // Convert particle from normalized device coordinates to screen pixels
                vec2 particleScreenPos = vec2((projected.x + 1.0) * 0.5 * viewport.x, (projected.y + 1.0) * 0.5 * viewport.y);

                vMouseDist = distance(particleScreenPos, mouseScreenPos);

                gl_Position = projectionMatrix * mvPosition;
                float size = scale * ( 300.0 / -mvPosition.z );
                gl_PointSize = max(1.0, size * 0.8);
            }
        `,
        fragmentShader: `
            varying vec3 vBaseColor;
            varying float vMouseDist;

            void main() {
                float d = distance(gl_PointCoord, vec2(0.5, 0.5));
                if (d > 0.5) discard;
                
                float alpha = pow(1.0 - d * 2.0, 0.5);
                
                // radius in pixels
                float hoverRadius = 100.0; 
                float colorMix = 1.0 - smoothstep(0.0, hoverRadius, vMouseDist);
                vec3 hoverColor = vec3(1.0, 0.3, 0.0); // Yellowish-red

                vec3 finalColor = mix(vBaseColor, hoverColor, colorMix);

                gl_FragColor = vec4(finalColor, alpha);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    const createTrail = () => {
        const maxTrailPoints = 150;
        const trailPoints = Array.from({ length: maxTrailPoints }, () => new THREE.Vector3());
        const trailCurve = new THREE.CatmullRomCurve3(trailPoints);
        const trailGeometry = new THREE.TubeGeometry(trailCurve, maxTrailPoints - 1, 0.2, 8, false);
        
        const fragmentShader = `
            uniform float time;
            uniform vec3 color;
            uniform float opacity;
            varying float vUv;
            void main() {
                float alpha = pow(1.0 - vUv, 2.0) * 0.2 * opacity;
                gl_FragColor = vec4(color, alpha);
            }
        `;

        const trailMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                color: { value: new THREE.Color(0x7DD3FC) },
                opacity: { value: 0.0 }
            },
            vertexShader: `
                varying float vUv;
                void main() {
                    vUv = uv.x;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide
        });
        const trailMesh = new THREE.Mesh(trailGeometry, trailMaterial);
        trailMesh.visible = false;
        scene.add(trailMesh);
        return { maxTrailPoints, trailPoints, trailCurve, trailGeometry, trailMaterial, trailMesh };
    };

    const automatedTrails: any[] = [];
    const trailConfigs = [
        { color: 0x7DD3FC, rotation: new THREE.Euler(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2), radiusX: 120, radiusY: 100, speed: 1800 },
        { color: 0x7DD3FC, rotation: new THREE.Euler(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2), radiusX: 110, radiusY: 130, speed: 1950 },
        { color: 0x7DD3FC, rotation: new THREE.Euler(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2), radiusX: 140, radiusY: 110, speed: 2100 },
    ];

    trailConfigs.forEach(config => {
        const trail = createTrail();
        trail.trailMesh.visible = true;
        (trail.trailMaterial.uniforms.color.value as THREE.Color).set(config.color);
        automatedTrails.push({ ...trail, ...config, baseRotation: config.rotation.clone() });
    });

    const onWindowResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      (material.uniforms.viewport as THREE.IUniform<THREE.Vector2>).value.set(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onWindowResize);

    const onMouseMove = (event: MouseEvent) => {
        mousePosition.current.x = (event.clientX / window.innerWidth) * 2 - 1;
        mousePosition.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', onMouseMove);


    const clock = new THREE.Clock();
    const simplex = new SimplexNoise();
    
    const animate = () => {
      requestAnimationFrame(animate);
      const deltaTime = clock.getDelta();
      const elapsedTime = clock.getElapsedTime();

      (material.uniforms.time as THREE.IUniform<number>).value = elapsedTime;
      (material.uniforms.mousePos as THREE.IUniform<THREE.Vector3>).value.set(mousePosition.current.x, mousePosition.current.y, 0);

      automatedTrails.forEach(trail => {
          (trail.trailMaterial.uniforms.time as THREE.IUniform<number>).value = elapsedTime;
          const opacityUniform = (trail.trailMaterial.uniforms.opacity as THREE.IUniform<number>);
          if (opacityUniform.value < 1.0) {
            opacityUniform.value += deltaTime * 0.5;
          }
      });
      
      const pPositions = particles.geometry.attributes.position.array as Float32Array;
      
      const boundingBox = new THREE.Box3(
        new THREE.Vector3(-60, -40, -40),
        new THREE.Vector3(60, 40, 40)
      );
      
      const speedModulator = ((Math.sin(elapsedTime * 0.1) + 1) / 2) * 0.2 + 0.1;

      // Mouse interaction for repulsion (CPU side)
      const mouseNDC = new THREE.Vector2(mousePosition.current.x, mousePosition.current.y);
      const mouseScreenPos = new THREE.Vector2(
          (mouseNDC.x + 1) * 0.5 * window.innerWidth,
          (mouseNDC.y + 1) * 0.5 * window.innerHeight
      );

      const tempParticlePos = new THREE.Vector3();

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        
        tempParticlePos.set(pPositions[i3], pPositions[i3 + 1], pPositions[i3 + 2]);
        const projected = tempParticlePos.clone().project(camera);
        const particleScreenPos = new THREE.Vector2(
          (projected.x + 1) * 0.5 * window.innerWidth,
          (projected.y + 1) * 0.5 * window.innerHeight
        );

        const distanceToMouse = particleScreenPos.distanceTo(mouseScreenPos);
        const repelRadius = 100; // in pixels, same as shader
        if (distanceToMouse < repelRadius) {
            const repelForce = (1 - distanceToMouse / repelRadius) * 0.05; // smaller force
            
            // To get a meaningful repulsion direction, we still need a 3D mouse position.
            // We'll project it onto the particle's plane.
            const mouseWorld = new THREE.Vector3(mouseNDC.x, mouseNDC.y, 0.5).unproject(camera);
            const dir = mouseWorld.sub(camera.position).normalize();
            const distance = - (camera.position.clone().sub(tempParticlePos)).dot(camera.getWorldDirection(new THREE.Vector3())) / dir.dot(camera.getWorldDirection(new THREE.Vector3()));
            const mouse3DAtParticleDepth = camera.position.clone().add(dir.multiplyScalar(distance));
            
            const repelVec = tempParticlePos.clone().sub(mouse3DAtParticleDepth).normalize().multiplyScalar(repelForce);
            
            velocities[i3] += repelVec.x;
            velocities[i3 + 1] += repelVec.y;
            velocities[i3 + 2] += repelVec.z;
        }
        
        const noiseScale = 0.05;
        const timeFactor = elapsedTime * 0.1;
        const curlStrength = 0.02;

        const noiseX = simplex.noise3d(tempParticlePos.x * noiseScale, tempParticlePos.y * noiseScale, timeFactor);
        const noiseY = simplex.noise3d(tempParticlePos.y * noiseScale, tempParticlePos.z * noiseScale, timeFactor);
        const noiseZ = simplex.noise3d(tempParticlePos.z * noiseScale, tempParticlePos.x * noiseScale, timeFactor);

        velocities[i3] += noiseY * curlStrength;
        velocities[i3 + 1] += noiseZ * curlStrength;
        velocities[i3 + 2] += noiseX * curlStrength;
        
        const centerVec = tempParticlePos.clone().multiplyScalar(-1);
        const centerDistSq = tempParticlePos.lengthSq();
        const repulsionStrength = 0.0001;
        if (centerDistSq > 1) {
            velocities[i3] += centerVec.x * repulsionStrength;
            velocities[i3 + 1] += centerVec.y * repulsionStrength;
            velocities[i3 + 2] += centerVec.z * repulsionStrength;
        }

        velocities[i3] *= 0.98;
        velocities[i3 + 1] *= 0.98;
        velocities[i3 + 2] *= 0.98;

        pPositions[i3] += velocities[i3] * speedModulator;
        pPositions[i3 + 1] += velocities[i3 + 1] * speedModulator;
        pPositions[i3 + 2] += velocities[i3 + 2] * speedModulator;

        if (pPositions[i3] > boundingBox.max.x || pPositions[i3] < boundingBox.min.x) {
            pPositions[i3] = Math.max(boundingBox.min.x, Math.min(boundingBox.max.x, pPositions[i3]));
            velocities[i3] *= -0.5;
        }
        if (pPositions[i3 + 1] > boundingBox.max.y || pPositions[i3 + 1] < boundingBox.min.y) {
            pPositions[i3 + 1] = Math.max(boundingBox.min.y, Math.min(boundingBox.max.y, pPositions[i3 + 1]));
            velocities[i3 + 1] *= -0.5;
        }
        if (pPositions[i3 + 2] > boundingBox.max.z || pPositions[i3 + 2] < boundingBox.min.z) {
            pPositions[i3 + 2] = Math.max(boundingBox.min.z, Math.min(boundingBox.max.z, pPositions[i3 + 2]));
            velocities[i3 + 2] *= -0.5;
        }
      }
      particles.geometry.attributes.position.needsUpdate = true;
      
      automatedTrails.forEach(trail => {
          const t = elapsedTime * trail.speed / 1000;
          const x = trail.radiusX * Math.cos(t);
          const y = trail.radiusY * Math.sin(t);
          const z = trail.radiusY * Math.sin(t) * Math.cos(t);
          
          const rotationSpeed = 0.05;
          trail.rotation.x = trail.baseRotation.x + elapsedTime * rotationSpeed;
          trail.rotation.y = trail.baseRotation.y + elapsedTime * rotationSpeed * 0.5;

          const point = new THREE.Vector3(x, y, z).applyEuler(trail.rotation);
          
          trail.trailPoints.shift();
          trail.trailPoints.push(point);

          const newCurve = new THREE.CatmullRomCurve3(trail.trailPoints);
          const newGeometry = new THREE.TubeGeometry(newCurve, trail.maxTrailPoints - 1, 0.2, 8, false);
          trail.trailMesh.geometry.dispose();
          trail.trailMesh.geometry = newGeometry;
      });

      renderer.render(fadeScene, fadeCamera);
      composer.render();
    };

    animate();

    return () => {
      window.removeEventListener('resize', onWindowResize);
      window.removeEventListener('mousemove', onMouseMove);
      
      if (currentMount) {
        currentMount.removeChild(renderer.domElement);
      }
      
      scene.traverse(object => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
            if (object.geometry) object.geometry.dispose();
            const mat = object.material as (THREE.ShaderMaterial | THREE.MeshBasicMaterial);
            if(Array.isArray(mat)) {
                mat.forEach(m => m.dispose());
            } else if (mat.dispose) {
                mat.dispose();
            }
        }
      });
      renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} className="fixed top-0 left-0 w-full h-full z-10" />;
};

export default QuantaVis;
