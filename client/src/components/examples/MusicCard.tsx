import MusicCard from '../MusicCard';

export default function MusicCardExample() {
  return (
    <div className="max-w-sm">
      <MusicCard
        id="1"
        title="Life Experiences"
        album="Project DNA Vol. 1"
        duration="3:42"
        price={0.99}
      />
    </div>
  );
}
