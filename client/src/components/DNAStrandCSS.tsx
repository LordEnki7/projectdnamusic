interface DNAStrandCSSProps {
  className?: string;
}

export default function DNAStrandCSS({ className = '' }: DNAStrandCSSProps) {
  return (
    <div className={className}>
      <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-chart-3/5 to-chart-2/5" />
        
        <div className="relative">
          <svg 
            viewBox="0 0 300 600" 
            className="w-full max-w-md h-full max-h-[600px]"
            style={{ filter: 'drop-shadow(0 0 30px rgba(168, 85, 247, 0.6))' }}
          >
            <defs>
              <radialGradient id="glowPurple">
                <stop offset="0%" stopColor="#a855f7" stopOpacity="1" />
                <stop offset="100%" stopColor="#d946ef" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="glowCyan">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="1" />
                <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
              </radialGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              <linearGradient id="purpleGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#a855f7" stopOpacity="1">
                  <animate attributeName="stopColor" values="#a855f7; #d946ef; #a855f7" dur="3s" repeatCount="indefinite" />
                </stop>
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="1">
                  <animate attributeName="stopColor" values="#06b6d4; #0891b2; #06b6d4" dur="3s" repeatCount="indefinite" />
                </stop>
              </linearGradient>
              <linearGradient id="cyanGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="1">
                  <animate attributeName="stopColor" values="#06b6d4; #0891b2; #06b6d4" dur="3s" repeatCount="indefinite" />
                </stop>
                <stop offset="100%" stopColor="#a855f7" stopOpacity="1">
                  <animate attributeName="stopColor" values="#a855f7; #d946ef; #a855f7" dur="3s" repeatCount="indefinite" />
                </stop>
              </linearGradient>
            </defs>
            
            <g className="animate-[spin_30s_linear_infinite] origin-center" style={{ transformOrigin: '150px 300px' }}>
              <path
                d="M 80,50 Q 150,70 220,90 Q 150,110 80,130 Q 150,150 220,170 Q 150,190 80,210 Q 150,230 220,250 Q 150,270 80,290 Q 150,310 220,330 Q 150,350 80,370 Q 150,390 220,410 Q 150,430 80,450 Q 150,470 220,490 Q 150,510 80,530 Q 150,550 220,570"
                stroke="url(#purpleGradient)"
                strokeWidth="8"
                fill="none"
                filter="url(#glow)"
                strokeLinecap="round"
              />
              <path
                d="M 220,50 Q 150,70 80,90 Q 150,110 220,130 Q 150,150 80,170 Q 150,190 220,210 Q 150,230 80,250 Q 150,270 220,290 Q 150,310 80,330 Q 150,350 220,370 Q 150,390 80,410 Q 150,430 220,450 Q 150,470 80,490 Q 150,510 220,530 Q 150,550 80,570"
                stroke="url(#cyanGradient)"
                strokeWidth="8"
                fill="none"
                filter="url(#glow)"
                strokeLinecap="round"
              />
              {[50, 90, 130, 170, 210, 250, 290, 330, 370, 410, 450, 490, 530, 570].map((y, i) => (
                <g key={i}>
                  <circle cx="80" cy={y} r="12" fill="url(#glowPurple)" filter="url(#glow)">
                    <animate attributeName="r" values="10;14;10" dur="2s" repeatCount="indefinite" begin={`${i * 0.15}s`} />
                  </circle>
                  <circle cx="220" cy={y} r="12" fill="url(#glowCyan)" filter="url(#glow)">
                    <animate attributeName="r" values="10;14;10" dur="2s" repeatCount="indefinite" begin={`${i * 0.15}s`} />
                  </circle>
                  <line x1="80" y1={y} x2="220" y2={y} stroke="#f59e0b" strokeWidth="3" opacity="0.7" filter="url(#glow)">
                    <animate attributeName="opacity" values="0.5;0.9;0.5" dur="2s" repeatCount="indefinite" begin={`${i * 0.15}s`} />
                  </line>
                </g>
              ))}
            </g>
          </svg>
        </div>

        <div className="absolute inset-0 pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: `${Math.random() * 4 + 2}px`,
                height: `${Math.random() * 4 + 2}px`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                background: i % 2 === 0 ? '#a855f7' : '#06b6d4',
                opacity: Math.random() * 0.5 + 0.2,
                animation: `float ${Math.random() * 3 + 2}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
      </div>
      
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
      `}</style>
    </div>
  );
}
