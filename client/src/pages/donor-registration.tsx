import { useState } from "react";
import { useLocation } from "wouter";
import Header from "@/components/header";
import DonorForm from "@/components/donor-form";
import QRScanner from "@/components/qr-scanner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QrCode, UserPlus } from "lucide-react";

export default function DonorRegistration() {
  const [, setLocation] = useLocation();
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [qrData, setQrData] = useState<any>(null);
  
  const handleQRSuccess = (data: any) => {
    setQrData(data);
    setShowQRScanner(false);
  };
  
  const handleRegistrationSuccess = () => {
    setLocation("/donors/search");
  };
  
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Cadastro de Doador
          </h2>
          <p className="text-muted-foreground ">
            Adicione um novo doador ao sistema
          </p>
        </div>
        
        {/* QR Code Scanner Option */}
        {!qrData && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-accent rounded-lg">
                  <QrCode className="w-8 h-8 text-accent-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-accent-foreground">
                    Digitalizar QR Code do BI
                  </h3>
                  <p className="text-sm text-accent-foreground/80  hidden sm:block">
                    Posicione o QR Code do Bilhete de Identidade em frente à câmera
                  </p>
                </div>
                <Button 
                  onClick={() => setShowQRScanner(true)}
                  data-testid="button-scan-qr"
                  className="bg-accent-foreground hover:bg-accent-foreground/90"
                >
                  Digitalizar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* QR Scanner Modal */}
        {showQRScanner && (
          <QRScanner
            onSuccess={handleQRSuccess}
            onClose={() => setShowQRScanner(false)}
          />
        )}
        
        {/* Registration Form */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-6">
              <UserPlus className="w-6 h-6 text-primary" />
              <h3 className="text-lg font-semibold">
                Informações do Doador
              </h3>
            </div>
            
            <DonorForm
              initialData={qrData}
              onSuccess={handleRegistrationSuccess}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
