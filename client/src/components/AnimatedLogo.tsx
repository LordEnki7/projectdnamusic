import { useRef, useState } from 'react';

const logoVideo = '/media/logo-video.mp4';
const logoImg = '/media/logo.jpg';

interface AnimatedLogoProps {
  className?: string;
}

export default function AnimatedLogo({ className = '' }: AnimatedLogoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleMouseEnter = () => {
    if (videoRef.current && !isPlaying) {
      videoRef.current.currentTime = 0;
      setIsPlaying(true);
      videoRef.current.play().catch(err => console.log('Logo video play failed:', err));
    }
  };

  const handleEnded = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  return (
    <video
      ref={videoRef}
      src={logoVideo}
      poster={logoImg}
      muted
      playsInline
      className={`${className} transition-opacity duration-300`}
      onMouseEnter={handleMouseEnter}
      onEnded={handleEnded}
      aria-label="Shakim & Project DNA Logo"
    />
  );
}
