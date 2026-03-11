import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';

const licenseFormSchema = z.object({
  beatId: z.string(),
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Valid email is required'),
  artistName: z.string().optional(),
  licenseType: z.enum(['non-exclusive', 'exclusive', 'lease']),
  signature: z.string().min(2, 'Signature is required'),
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms and conditions',
  }),
});

type LicenseFormData = z.infer<typeof licenseFormSchema>;

interface BeatLicenseFormProps {
  beatId: string;
  beatTitle: string;
  onSubmit: (data: LicenseFormData) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export default function BeatLicenseForm({
  beatId,
  beatTitle,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: BeatLicenseFormProps) {
  const form = useForm<LicenseFormData>({
    resolver: zodResolver(licenseFormSchema),
    defaultValues: {
      beatId,
      fullName: '',
      email: '',
      artistName: '',
      licenseType: 'non-exclusive',
      signature: '',
      termsAccepted: false,
    },
  });

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold" data-testid="text-license-title">
          Beat License Agreement
        </h2>
        <p className="text-muted-foreground mt-1" data-testid="text-beat-title">
          For: {beatTitle}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Legal Name *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="John Doe"
                    {...field}
                    data-testid="input-full-name"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Address *</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="john@example.com"
                    {...field}
                    data-testid="input-email"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="artistName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Artist/Company Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Your stage name or company"
                    {...field}
                    data-testid="input-artist-name"
                  />
                </FormControl>
                <FormDescription>
                  Optional: Your stage name or company name
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="licenseType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>License Type *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger data-testid="select-license-type">
                      <SelectValue placeholder="Select license type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="non-exclusive">Non-Exclusive ($29.99)</SelectItem>
                    <SelectItem value="lease">Lease ($99.99)</SelectItem>
                    <SelectItem value="exclusive">Exclusive ($499.99)</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Non-exclusive allows others to license this beat. Exclusive gives you sole rights.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="bg-muted p-4 rounded-md space-y-2">
            <h3 className="font-semibold text-sm">License Terms Summary</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
              <li>You receive full rights to use this beat commercially</li>
              <li>Producer credit required: "Produced by Shakim & Project DNA"</li>
              <li>Non-exclusive licenses allow the beat to be sold to others</li>
              <li>Exclusive licenses grant sole ownership rights</li>
              <li>All sales are final - no refunds</li>
            </ul>
          </div>

          <FormField
            control={form.control}
            name="signature"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Digital Signature *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Type your full name to sign"
                    {...field}
                    data-testid="input-signature"
                  />
                </FormControl>
                <FormDescription>
                  By typing your name, you electronically sign this agreement
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="termsAccepted"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="checkbox-terms"
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    I accept the terms and conditions *
                  </FormLabel>
                  <FormDescription>
                    I agree to the licensing terms and confirm this purchase is final
                  </FormDescription>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-3 pt-4">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
                data-testid="button-cancel-license"
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={isSubmitting}
              data-testid="button-submit-license"
            >
              {isSubmitting ? 'Submitting...' : 'Sign & Continue to Payment'}
            </Button>
          </div>
        </form>
      </Form>
    </Card>
  );
}
