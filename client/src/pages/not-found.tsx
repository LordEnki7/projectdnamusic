import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Link } from "wouter";
import AnimatedLogo from "@/components/AnimatedLogo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center gap-8 p-4">
      <Link href="/">
        <AnimatedLogo className="h-32 w-auto cursor-pointer" />
      </Link>
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">404 Page Not Found</h1>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            The page you're looking for doesn't exist.
          </p>
          <Link href="/" className="block mt-6">
            <Button className="w-full" data-testid="button-go-home">
              Go Home
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
