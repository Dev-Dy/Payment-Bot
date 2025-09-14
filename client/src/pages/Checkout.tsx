import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { CreditCard, Package, ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

interface OrderDetails {
  id: string;
  product: {
    id: string;
    name: string;
    description: string;
    price: string;
    currency: string;
  };
  total_amount: string;
  currency: string;
  status: string;
  stripe_payment_intent_id?: string;
  telegram_user_id: string;
  telegram_username?: string;
}

interface PaymentFormProps {
  orderId: string;
  clientSecret: string;
  orderDetails: OrderDetails;
}

function PaymentForm({ orderId, clientSecret, orderDetails }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'succeeded' | 'failed'>('idle');
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);
    setPaymentStatus('processing');

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout?order=${orderId}&status=completed`,
      },
    });

    if (error) {
      setPaymentStatus('failed');
      toast({
        title: "Payment failed",
        description: error.message || "There was an error processing your payment.",
        variant: "destructive",
      });
    } else {
      setPaymentStatus('succeeded');
    }

    setIsLoading(false);
  };

  if (paymentStatus === 'succeeded') {
    return (
      <div className="text-center space-y-4">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
        <h3 className="text-lg font-semibold text-green-700">Payment Successful!</h3>
        <p className="text-muted-foreground">
          Your payment has been processed successfully. You should receive a confirmation shortly.
        </p>
      </div>
    );
  }

  if (paymentStatus === 'failed') {
    return (
      <div className="text-center space-y-4">
        <XCircle className="h-16 w-16 text-red-500 mx-auto" />
        <h3 className="text-lg font-semibold text-red-700">Payment Failed</h3>
        <p className="text-muted-foreground">
          There was an issue processing your payment. Please try again.
        </p>
        <Button onClick={() => setPaymentStatus('idle')} data-testid="button-retry-payment">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <PaymentElement />
      </div>
      
      <Separator />
      
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          Total: <span className="font-semibold">{orderDetails.currency} {orderDetails.total_amount}</span>
        </div>
        <Button 
          type="submit" 
          disabled={!stripe || isLoading}
          className="min-w-32"
          data-testid="button-complete-payment"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Processing...
            </div>
          ) : (
            <>
              <CreditCard className="h-4 w-4 mr-2" />
              Complete Payment
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

export default function Checkout() {
  const [location] = useLocation();
  const { toast } = useToast();
  
  // Extract order ID from query params
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('order');
  const status = urlParams.get('status');

  // Handle return from Stripe
  useEffect(() => {
    if (status === 'completed' && orderId) {
      toast({
        title: "Payment Completed",
        description: "Your payment has been processed successfully!",
      });
    }
  }, [status, orderId, toast]);

  // Fetch order details
  const { data: orderDetails, isLoading: orderLoading, error: orderError } = useQuery<OrderDetails>({
    queryKey: ['/api/orders', orderId],
    enabled: !!orderId,
  });

  // Generate payment intent for checkout
  const { data: paymentData, isLoading: paymentLoading, error: paymentError } = useQuery<{clientSecret: string, orderId: string}>({
    queryKey: ['/api/checkout', orderId],
    queryFn: async () => {
      const response = await fetch(`/api/orders/${orderId}/payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to create payment intent');
      }
      return response.json();
    },
    enabled: !!orderId && !!orderDetails && orderDetails.status === 'pending',
  });

  if (!orderId) {
    return (
      <div className="container max-w-2xl mx-auto py-8">
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            Invalid checkout link. Please use the payment link provided by the bot.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (orderLoading) {
    return (
      <div className="container max-w-2xl mx-auto py-8">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (orderError || !orderDetails) {
    return (
      <div className="container max-w-2xl mx-auto py-8">
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            Order not found or has expired. Please create a new order through the bot.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (orderDetails.status === 'paid') {
    return (
      <div className="container max-w-2xl mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <h2 className="text-2xl font-semibold text-green-700">Order Already Paid</h2>
              <p className="text-muted-foreground">
                This order has already been completed successfully.
              </p>
              <div className="bg-muted p-4 rounded-lg">
                <h3 className="font-medium">{orderDetails.product.name}</h3>
                <p className="text-sm text-muted-foreground">{orderDetails.product.description}</p>
                <p className="font-semibold mt-2">{orderDetails.currency} {orderDetails.total_amount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (orderDetails.status === 'cancelled' || orderDetails.status === 'refunded') {
    return (
      <div className="container max-w-2xl mx-auto py-8">
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            This order has been {orderDetails.status}. Please create a new order through the bot.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto py-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => window.history.back()}
          className="mb-4"
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Complete Your Purchase</h1>
        <p className="text-muted-foreground">
          Secure payment powered by Stripe
        </p>
      </div>

      <div className="space-y-6">
        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order Summary
            </CardTitle>
            <CardDescription>Order #{orderId.slice(-8)}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="font-medium" data-testid="text-product-name">{orderDetails.product.name}</h3>
                  <p className="text-sm text-muted-foreground" data-testid="text-product-description">
                    {orderDetails.product.description}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant={orderDetails.status === 'pending' ? 'secondary' : 'default'}>
                      {orderDetails.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold" data-testid="text-product-price">
                    {orderDetails.currency} {orderDetails.total_amount}
                  </p>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex justify-between items-center font-semibold">
                <span>Total</span>
                <span data-testid="text-total-amount">{orderDetails.currency} {orderDetails.total_amount}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Details
            </CardTitle>
            <CardDescription>
              Enter your payment information to complete the purchase
            </CardDescription>
          </CardHeader>
          <CardContent>
            {paymentLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-10 w-32 ml-auto" />
              </div>
            ) : paymentError ? (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  Failed to initialize payment. Please refresh the page and try again.
                </AlertDescription>
              </Alert>
            ) : paymentData?.clientSecret ? (
              <Elements 
                stripe={stripePromise} 
                options={{
                  clientSecret: paymentData.clientSecret,
                  appearance: {
                    theme: 'stripe',
                  },
                }}
              >
                <PaymentForm 
                  orderId={orderId} 
                  clientSecret={paymentData.clientSecret}
                  orderDetails={orderDetails}
                />
              </Elements>
            ) : (
              <Alert>
                <AlertDescription>
                  Unable to initialize payment. Please contact support.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}