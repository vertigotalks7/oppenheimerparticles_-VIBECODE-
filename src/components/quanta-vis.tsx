"use client";

import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import * as Tone from 'tone';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

const QuantaVis: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (isInitialized.current || !mountRef.current) return;
    isInitialized.current = true;

    const currentMount = mountRef.current;
    
    let isMouseDown = false;
    const mouse = new THREE.Vector2();
    let synth: Tone.FMSynth | null = null;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000a12, 0.02);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 50;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.autoClear = false;

    currentMount.appendChild(renderer.domElement);
    
    // Post-processing for bloom/blur effect
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.2, 0.2, 0.1);
    const composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    // Fading plane for motion blur trail effect
    const fadeMaterial = new THREE.MeshBasicMaterial({
      color: 0x000a12,
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
    const colors = new Float32Array(particleCount * 3);
    const scales = new Float32Array(particleCount);

    const colorPalette = [new THREE.Color(0x7DD3FC), new THREE.Color(0xFFFFFF), new THREE.Color(0x00A3FF)];
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 100;
      positions[i3 + 1] = (Math.random() - 0.5) * 100;
      positions[i3 + 2] = (Math.random() - 0.5) * 60 - 30;

      const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      scales[i] = Math.random() * 1.5 + 0.5;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1));
    
    const material = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 1.0 },
        },
        vertexShader: `
            attribute float scale;
            attribute vec3 color;
            varying vec3 vColor;
            void main() {
                vColor = color;
                vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
                gl_Position = projectionMatrix * modelViewPosition;
                gl_PointSize = scale * ( 300.0 / -modelViewPosition.z );
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            uniform float time;
            void main() {
                float d = distance(gl_PointCoord, vec2(0.5, 0.5));
                if (d > 0.5) discard;
                float alpha = 1.0 - d * 2.0;
                // Add a shimmering effect
                alpha *= 0.7 + 0.3 * sin(time * 10.0 + gl_FragCoord.x);
                gl_FragColor = vec4(vColor, alpha);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    const streakCount = 4000;
    const streakGeometry = new THREE.BufferGeometry();
    const streakPositions = new Float32Array(streakCount * 3);
    const streakLifetime = new Float32Array(streakCount);
    streakGeometry.setAttribute('position', new THREE.BufferAttribute(streakPositions, 3));
    streakGeometry.setAttribute('lifetime', new THREE.BufferAttribute(streakLifetime, 1));
    
    const streakMaterial = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(0xffffff) },
      },
      vertexShader: `
        attribute float lifetime;
        varying float vLifetime;
        void main() {
          vLifetime = lifetime;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = (1.0 - lifetime) * 10.0 + 2.0;
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        varying float vLifetime;
        void main() {
          float r = 0.0;
          vec2 cxy = 2.0 * gl_PointCoord - 1.0;
          r = dot(cxy, cxy);
          if (r > 1.0) {
              discard;
          }
          gl_FragColor = vec4(color, (1.0 - vLifetime) * (1.0 - r));
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const streaks = new THREE.Points(streakGeometry, streakMaterial);
    scene.add(streaks);
    let currentStreakIndex = 0;

    const setupAudio = async () => {
      await Tone.start();
      if (!synth) {
        synth = new Tone.FMSynth({
          harmonicity: 3.01,
          modulationIndex: 14,
          envelope: { attack: 0.01, decay: 0.2, release: 0.5 },
          modulationEnvelope: { attack: 0.01, decay: 0.3, release: 0.5 },
        }).toDestination();
      }
    };
    window.addEventListener('mousedown', setupAudio, { once: true });
    window.addEventListener('touchstart', setupAudio, { once: true });

    const onMouseMove = (event: MouseEvent) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };
    const onMouseDown = () => {
      isMouseDown = true;
      if (synth && Tone.context.state === 'running') {
        synth.triggerAttackRelease('C2', '8n', Tone.now());
      }
    };
    const onMouseUp = () => { isMouseDown = false; };
    
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);

    const onWindowResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };
    window.addEventListener('resize', onWindowResize);

    const clock = new THREE.Clock();
    
    const animate = () => {
      requestAnimationFrame(animate);
      const deltaTime = clock.getDelta();
      const elapsedTime = clock.getElapsedTime();

      (material.uniforms.time as THREE.IUniform<number>).value = elapsedTime;

      const mouseWorldPos = new THREE.Vector3(mouse.x, mouse.y, 0.5);
      mouseWorldPos.unproject(camera);
      const dir = mouseWorldPos.sub(camera.position).normalize();
      const distance = -camera.position.z / dir.z;
      const mousePoint = camera.position.clone().add(dir.multiplyScalar(distance));
      
      const pPositions = particles.geometry.attributes.position.array as Float32Array;
      
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        const particlePos = new THREE.Vector3(pPositions[i3], pPositions[i3 + 1], pPositions[i3 + 2]);
        const distVec = mousePoint.clone().sub(particlePos);
        const distSq = distVec.lengthSq();

        if (distSq < 100) {
          const force = 10 / (distSq + 10);
          velocities[i3] -= distVec.x * force * 0.1;
          velocities[i3 + 1] -= distVec.y * force * 0.1;
        }
        
        // Add some random motion
        velocities[i3] += (Math.random() - 0.5) * 0.01;
        velocities[i3 + 1] += (Math.random() - 0.5) * 0.01;
        velocities[i3 + 2] += (Math.random() - 0.5) * 0.01;

        // Damping
        velocities[i3] *= 0.96;
        velocities[i3 + 1] *= 0.96;
        velocities[i3 + 2] *= 0.96;

        pPositions[i3] += velocities[i3];
        pPositions[i3 + 1] += velocities[i3 + 1];
        pPositions[i3 + 2] += velocities[i3 + 2];
        
        // Add wave motion
        pPositions[i3+2] += Math.sin(elapsedTime * 0.5 + i) * 0.01;
      }
      particles.geometry.attributes.position.needsUpdate = true;

      if (isMouseDown) {
        for(let i=0; i<5; i++) {
            const index = currentStreakIndex % streakCount;
            const i3 = index * 3;
            streakPositions[i3] = mousePoint.x + (Math.random() - 0.5) * 0.5;
            streakPositions[i3 + 1] = mousePoint.y + (Math.random() - 0.5) * 0.5;
            streakPositions[i3 + 2] = mousePoint.z + (Math.random() - 0.5) * 0.5;
            streakLifetime[index] = 0.0;
            currentStreakIndex++;
        }
      }
      
      for (let i = 0; i < streakCount; i++) {
        if (streakLifetime[i] < 1.0) {
          streakLifetime[i] += deltaTime * 0.7;
        }
      }
      streaks.geometry.attributes.position.needsUpdate = true;
      streaks.geometry.attributes.lifetime.needsUpdate = true;

      // Render the fade effect to create trails
      renderer.render(fadeScene, fadeCamera);
      composer.render();
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('resize', onWindowResize);
      window.removeEventListener('mousedown', setupAudio);
      window.removeEventListener('touchstart', setupAudio);
      
      if (currentMount) {
        currentMount.removeChild(renderer.domElement);
      }
      
      scene.traverse(object => {
        if (object instanceof THREE.Points) {
          if (object.geometry) object.geometry.dispose();
          const mat = object.material as THREE.ShaderMaterial;
          if (mat.dispose) mat.dispose();
        }
      });
      renderer.dispose();
      composer.dispose();
    };
  }, []);

  return <div ref={mountRef} className="fixed top-0 left-0 w-full h-full" />;
};

export default QuantaVis;
