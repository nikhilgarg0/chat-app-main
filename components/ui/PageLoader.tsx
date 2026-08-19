"use client";

export default function PageLoader() {
  return (
    <>
      <style>{`
        .nexus-loader {
          transform: rotateZ(45deg);
          perspective: 1000px;
          border-radius: 50%;
          width: 48px;
          height: 48px;
          color: var(--accent);
          position: relative;
        }
        .nexus-loader::before,
        .nexus-loader::after {
          content: '';
          display: block;
          position: absolute;
          top: 0;
          left: 0;
          width: inherit;
          height: inherit;
          border-radius: 50%;
          animation: nexus-spin 1s linear infinite;
        }
        .nexus-loader::before {
          transform: rotateX(70deg);
        }
        .nexus-loader::after {
          color: var(--ai-accent);
          transform: rotateY(70deg);
          animation-delay: 0.4s;
        }
        @keyframes nexus-spin {
          0%, 100% { box-shadow: 0.2em 0px 0 0px currentColor; }
          12%       { box-shadow: 0.2em 0.2em 0 0 currentColor; }
          25%       { box-shadow: 0 0.2em 0 0px currentColor; }
          37%       { box-shadow: -0.2em 0.2em 0 0 currentColor; }
          50%       { box-shadow: -0.2em 0 0 0 currentColor; }
          62%       { box-shadow: -0.2em -0.2em 0 0 currentColor; }
          75%       { box-shadow: 0px -0.2em 0 0 currentColor; }
          87%       { box-shadow: 0.2em -0.2em 0 0 currentColor; }
        }
      `}</style>

      <div className="flex flex-1 min-h-[100dvh] flex-col items-center justify-center bg-[var(--bg-base)] px-4 relative overflow-hidden">
        {/* Ambient glow blobs */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-[var(--accent)]/8 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-[var(--ai-accent)]/8 rounded-full blur-[80px] pointer-events-none" />

        <div className="flex flex-col items-center gap-5 z-10 animate-slide-up">
          <div className="relative flex items-center justify-center">
            <span className="nexus-loader" />
          </div>
        </div>

      </div>
    </>
  );
}