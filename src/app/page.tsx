import QuantaVis from '@/components/quanta-vis';

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background">
      <QuantaVis />
      <div className="relative z-10 flex flex-col items-center text-center p-8 bg-black/20 backdrop-blur-md rounded-xl border border-white/10 shadow-lg">
        <h1 className="text-5xl md:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-white to-cyan-300 drop-shadow-lg">
          QuantaVis
        </h1>
        <p className="mt-4 text-lg text-cyan-100/80 max-w-2xl">
          An interactive particle simulation inspired by the quantum world. Move your mouse to interact with the particles. Click and drag to create streaks of light.
        </p>
      </div>
    </main>
  );
}
