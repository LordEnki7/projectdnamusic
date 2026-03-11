import BeatCard from '../BeatCard';

export default function BeatCardExample() {
  return (
    <div className="max-w-lg">
      <BeatCard
        id="1"
        title="Cosmic Vibes"
        bpm={140}
        musicKey="Am"
        genre="Hip Hop"
        price={29.99}
      />
    </div>
  );
}
