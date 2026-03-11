import ProducerServiceCard from '../ProducerServiceCard';

export default function ProducerServiceCardExample() {
  return (
    <div className="max-w-md">
      <ProducerServiceCard
        id="1"
        title="Beat Lease"
        description="High-quality beat lease with unlimited streams"
        price={49.99}
        features={[
          'MP3 & WAV files included',
          'Unlimited streams',
          'Distribution rights',
          '2,500 sales copies',
        ]}
        popular
      />
    </div>
  );
}
