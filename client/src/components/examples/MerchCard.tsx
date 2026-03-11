import MerchCard from '../MerchCard';

export default function MerchCardExample() {
  return (
    <div className="max-w-sm">
      <MerchCard
        id="1"
        name="DNA Strand T-Shirt"
        description="Premium cotton tee with glowing DNA strand design"
        price={29.99}
        sizes={['S', 'M', 'L', 'XL', 'XXL']}
      />
    </div>
  );
}
