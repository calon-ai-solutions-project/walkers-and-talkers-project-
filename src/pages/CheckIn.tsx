import { useParams } from "react-router-dom";

export default function CheckIn() {
  const { token } = useParams<{ token: string }>();

  return (
    <main
      className="min-h-screen flex items-center justify-center p-8 text-white"
      style={{
        background:
          "linear-gradient(135deg, #0A1A5E 0%, #1E3A8A 50%, #0A1A5E 100%)",
      }}
    >
      <div className="text-center max-w-md">
        <div className="text-7xl mb-6">👋</div>
        <h1 className="text-4xl font-serif mb-3">Check-in received</h1>
        <p className="text-lg opacity-80 mb-2">
          Thanks for tapping in. Enjoy the walk.
        </p>
        <p className="text-sm opacity-50 mt-12 font-mono break-all">
          ref: {token}
        </p>
        <p className="text-xs opacity-40 mt-4">
          The full member portal goes live shortly.
        </p>
      </div>
    </main>
  );
}
