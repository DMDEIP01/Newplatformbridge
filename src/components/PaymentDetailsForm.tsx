import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

interface PaymentDetailsFormProps {
  paymentMethod: string;
  onPaymentMethodChange: (method: string) => void;
  // Payment date
  paymentDebitDate?: string;
  onPaymentDebitDateChange?: (value: string) => void;
  // EU specific fields
  iban?: string;
  bic?: string;
  onIbanChange?: (value: string) => void;
  onBicChange?: (value: string) => void;
  // Card fields (common)
  cardNumber?: string;
  expiryDate?: string;
  cvv?: string;
  cardholderName?: string;
  onCardNumberChange?: (value: string) => void;
  onExpiryDateChange?: (value: string) => void;
  onCvvChange?: (value: string) => void;
  onCardholderNameChange?: (value: string) => void;
  // Other fields
  paymentReference?: string;
  onPaymentReferenceChange?: (value: string) => void;
  // Excess payment options
  showExcessPaymentOptions?: boolean;
  useMainPaymentForExcess?: boolean;
  onUseMainPaymentForExcessChange?: (value: boolean) => void;
  excessPaymentMethod?: string;
  onExcessPaymentMethodChange?: (value: string) => void;
  excessIban?: string;
  excessBic?: string;
  onExcessIbanChange?: (value: string) => void;
  onExcessBicChange?: (value: string) => void;
  excessCardNumber?: string;
  excessExpiryDate?: string;
  excessCvv?: string;
  excessCardholderName?: string;
  onExcessCardNumberChange?: (value: string) => void;
  onExcessExpiryDateChange?: (value: string) => void;
  onExcessCvvChange?: (value: string) => void;
  onExcessCardholderNameChange?: (value: string) => void;
  // Configuration
  showTitle?: boolean;
  showRegionSelector?: boolean;
  availableMethods?: string[];
  required?: boolean;
}

export default function PaymentDetailsForm({
  paymentMethod,
  onPaymentMethodChange,
  paymentDebitDate = "1",
  onPaymentDebitDateChange,
  iban = "",
  bic = "",
  onIbanChange,
  onBicChange,
  cardNumber = "",
  expiryDate = "",
  cvv = "",
  cardholderName = "",
  onCardNumberChange,
  onExpiryDateChange,
  onCvvChange,
  onCardholderNameChange,
  paymentReference = "",
  onPaymentReferenceChange,
  showExcessPaymentOptions = false,
  useMainPaymentForExcess = true,
  onUseMainPaymentForExcessChange,
  excessPaymentMethod = "",
  onExcessPaymentMethodChange,
  excessIban = "",
  excessBic = "",
  onExcessIbanChange,
  onExcessBicChange,
  excessCardNumber = "",
  excessExpiryDate = "",
  excessCvv = "",
  excessCardholderName = "",
  onExcessCardNumberChange,
  onExcessExpiryDateChange,
  onExcessCvvChange,
  onExcessCardholderNameChange,
  showTitle = true,
  showRegionSelector = true,
  availableMethods = ["card", "sepa_debit"],
  required = false,
}: PaymentDetailsFormProps) {
  const [region, setRegion] = useState<"EU">("EU");

  const formatIBAN = (value: string) => {
    // Remove spaces and convert to uppercase
    let formatted = value.replace(/\s/g, '').toUpperCase();
    // Add space every 4 characters
    formatted = formatted.replace(/(.{4})/g, '$1 ').trim();
    return formatted;
  };

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '');
    return cleaned.replace(/(\d{4})/g, '$1 ').trim();
  };

  const formatExpiryDate = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    return cleaned.replace(/(\d{2})(\d{0,2})/, '$1/$2');
  };

  return (
    <Card>
      {showTitle && (
        <CardHeader>
          <CardTitle>Payment Details</CardTitle>
          <CardDescription>
            {showRegionSelector 
              ? "Select your region and enter payment information" 
              : "Enter payment information"}
          </CardDescription>
        </CardHeader>
      )}
      <CardContent className="space-y-4">
        <Alert className="bg-primary/5 border-primary/20">
          <Info className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm">
            Policy premiums will be automatically deducted from the selected payment method on your chosen date each month.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="paymentMethod">Payment Method {required && "*"}</Label>
          <Select value={paymentMethod} onValueChange={onPaymentMethodChange} required={required}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select payment method" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              {availableMethods.includes("card") && (
                <SelectItem value="card">Credit/Debit Card</SelectItem>
              )}
              {availableMethods.includes("credit_card") && (
                <SelectItem value="credit_card">Credit Card</SelectItem>
              )}
              {region === "EU" && availableMethods.includes("sepa_debit") && (
                <SelectItem value="sepa_debit">SEPA Direct Debit</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {(paymentMethod === "sepa_debit" || paymentMethod === "card" || paymentMethod === "credit_card") && (
          <div className="space-y-2">
            <Label htmlFor="paymentDebitDate">Payment Date {required && "*"}</Label>
            <Select value={paymentDebitDate} onValueChange={onPaymentDebitDateChange} required={required}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select payment date" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50 max-h-[200px]">
                {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                  <SelectItem key={day} value={day.toString()}>
                    {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'} of each month
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Direct debit payments will be taken on this day each month
            </p>
          </div>
        )}

        {/* Card Payment Fields */}
        {(paymentMethod === "card" || paymentMethod === "credit_card") && (
          <div className="space-y-4 pt-2 border-t">
            <div className="space-y-2">
              <Label htmlFor="cardNumber">Card Number {required && "*"}</Label>
              <Input
                id="cardNumber"
                placeholder="1234 5678 9012 3456"
                maxLength={19}
                value={cardNumber}
                onChange={(e) => {
                  const formatted = formatCardNumber(e.target.value);
                  onCardNumberChange?.(formatted);
                }}
                required={required}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiryDate">Expiry Date {required && "*"}</Label>
                <Input
                  id="expiryDate"
                  placeholder="MM/YY"
                  maxLength={5}
                  value={expiryDate}
                  onChange={(e) => {
                    const formatted = formatExpiryDate(e.target.value);
                    onExpiryDateChange?.(formatted);
                  }}
                  required={required}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cvv">CVV {required && "*"}</Label>
                <Input
                  id="cvv"
                  placeholder="123"
                  maxLength={4}
                  type="password"
                  value={cvv}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    onCvvChange?.(value);
                  }}
                  required={required}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cardholderName">Cardholder Name {required && "*"}</Label>
              <Input
                id="cardholderName"
                placeholder="John Doe"
                value={cardholderName}
                onChange={(e) => onCardholderNameChange?.(e.target.value)}
                required={required}
              />
            </div>

            {onPaymentReferenceChange && (
              <div className="space-y-2">
                <Label htmlFor="paymentReference">Transaction Reference</Label>
                <Input
                  id="paymentReference"
                  placeholder="Enter transaction ID"
                  value={paymentReference}
                  onChange={(e) => onPaymentReferenceChange?.(e.target.value)}
                />
              </div>
            )}
          </div>
        )}

        {/* EU SEPA Direct Debit */}
        {paymentMethod === "sepa_debit" && region === "EU" && (
          <div className="space-y-4 pt-2 border-t">
            <div className="rounded-lg border bg-muted/50 p-3">
              <p className="text-sm font-medium">SEPA Bank Account Details</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="iban">IBAN {required && "*"}</Label>
              <Input
                id="iban"
                placeholder="DE89 3704 0044 0532 0130 00"
                value={iban}
                onChange={(e) => {
                  const formatted = formatIBAN(e.target.value);
                  onIbanChange?.(formatted);
                }}
                maxLength={34}
                required={required}
              />
              <p className="text-xs text-muted-foreground">
                International Bank Account Number
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bic">BIC/SWIFT Code {required && "*"}</Label>
              <Input
                id="bic"
                placeholder="DEUTDEFF"
                value={bic}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
                  onBicChange?.(value);
                }}
                maxLength={11}
                required={required}
              />
              <p className="text-xs text-muted-foreground">
                Bank Identifier Code (8 or 11 characters)
              </p>
            </div>
          </div>
        )}


        {/* Excess Payment Options */}
        {showExcessPaymentOptions && (paymentMethod === "sepa_debit" || paymentMethod === "card" || paymentMethod === "credit_card") && (
          <div className="space-y-4 pt-4 border-t mt-4">
            <div>
              <h4 className="font-semibold mb-2">Excess Payment Method</h4>
              <p className="text-sm text-muted-foreground mb-4">
                If a claim requires an excess payment, how would you like to pay?
              </p>
            </div>

            <RadioGroup 
              value={useMainPaymentForExcess ? "same" : "different"} 
              onValueChange={(value) => onUseMainPaymentForExcessChange?.(value === "same")}
            >
              <div className="flex items-start space-x-3 space-y-0">
                <RadioGroupItem value="same" id="excess-same" />
                <div className="space-y-1">
                  <Label htmlFor="excess-same" className="font-normal cursor-pointer">
                    Use the same payment method as premiums
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Excess will be charged to the account above
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3 space-y-0">
                <RadioGroupItem value="different" id="excess-different" />
                <div className="space-y-1">
                  <Label htmlFor="excess-different" className="font-normal cursor-pointer">
                    Use a different payment method for excess only
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Premiums will still be charged to the account above
                  </p>
                </div>
              </div>
            </RadioGroup>

            {!useMainPaymentForExcess && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <div className="space-y-2">
                  <Label htmlFor="excessPaymentMethod">Excess Payment Method {required && "*"}</Label>
                  <Select value={excessPaymentMethod} onValueChange={onExcessPaymentMethodChange} required={required && !useMainPaymentForExcess}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select excess payment method" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="card">Credit/Debit Card</SelectItem>
                      {region === "EU" && (
                        <SelectItem value="sepa_debit">SEPA Direct Debit</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Excess Card Payment Fields */}
                {excessPaymentMethod === "card" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="excessCardNumber">Card Number {required && "*"}</Label>
                      <Input
                        id="excessCardNumber"
                        placeholder="1234 5678 9012 3456"
                        maxLength={19}
                        value={excessCardNumber}
                        onChange={(e) => {
                          const formatted = formatCardNumber(e.target.value);
                          onExcessCardNumberChange?.(formatted);
                        }}
                        required={required && !useMainPaymentForExcess}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="excessExpiryDate">Expiry Date {required && "*"}</Label>
                        <Input
                          id="excessExpiryDate"
                          placeholder="MM/YY"
                          maxLength={5}
                          value={excessExpiryDate}
                          onChange={(e) => {
                            const formatted = formatExpiryDate(e.target.value);
                            onExcessExpiryDateChange?.(formatted);
                          }}
                          required={required && !useMainPaymentForExcess}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="excessCvv">CVV {required && "*"}</Label>
                        <Input
                          id="excessCvv"
                          placeholder="123"
                          maxLength={4}
                          type="password"
                          value={excessCvv}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '');
                            onExcessCvvChange?.(value);
                          }}
                          required={required && !useMainPaymentForExcess}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="excessCardholderName">Cardholder Name {required && "*"}</Label>
                      <Input
                        id="excessCardholderName"
                        placeholder="John Doe"
                        value={excessCardholderName}
                        onChange={(e) => onExcessCardholderNameChange?.(e.target.value)}
                        required={required && !useMainPaymentForExcess}
                      />
                    </div>
                  </div>
                )}

                {/* Excess SEPA Direct Debit */}
                {excessPaymentMethod === "sepa_debit" && region === "EU" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="excessIban">IBAN {required && "*"}</Label>
                      <Input
                        id="excessIban"
                        placeholder="DE89 3704 0044 0532 0130 00"
                        value={excessIban}
                        onChange={(e) => {
                          const formatted = formatIBAN(e.target.value);
                          onExcessIbanChange?.(formatted);
                        }}
                        maxLength={34}
                        required={required && !useMainPaymentForExcess}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="excessBic">BIC/SWIFT Code {required && "*"}</Label>
                      <Input
                        id="excessBic"
                        placeholder="DEUTDEFF"
                        value={excessBic}
                        onChange={(e) => {
                          const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
                          onExcessBicChange?.(value);
                        }}
                        maxLength={11}
                        required={required && !useMainPaymentForExcess}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
