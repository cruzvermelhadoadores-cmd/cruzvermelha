import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { X, Camera, AlertCircle } from "lucide-react";

interface QRScannerProps {
  onSuccess: (data: any) => void;
  onClose: () => void;
}

export default function QRScanner({ onSuccess, onClose }: QRScannerProps) {
  const [error, setError] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  useEffect(() => {
    startCamera();
    
    return () => {
      stopCamera();
    };
  }, []);
  
  const startCamera = async () => {
    try {
      setError("");
      setIsScanning(true);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError("Erro ao aceder à câmera. Verifique as permissões.");
      setIsScanning(false);
    }
  };
  
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };
  
  const handleManualInput = () => {
    // For demo purposes, simulate successful QR scan with sample data
    const sampleData = {
      biNumber: "123456789LA",
      fullName: "Maria Santos Silva",
      birthDate: "1990-05-15",
      gender: "F",
      municipality: "Luanda",
    };
    
    onSuccess(sampleData);
  };
  
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Digitalizar QR Code</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              data-testid="button-close-qr-scanner"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-4">
            {isScanning ? (
              <div className="relative aspect-square bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                  data-testid="video-qr-scanner"
                />
                <div className="absolute inset-0 border-2 border-white/50 rounded-lg">
                  <div className="absolute inset-4 border-2 border-primary rounded-lg"></div>
                </div>
              </div>
            ) : (
              <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Camera className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Câmera não disponível
                  </p>
                </div>
              </div>
            )}
            
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Posicione o QR Code do BI dentro da área marcada
              </p>
              
              <div className="space-y-2">
                <Button
                  onClick={startCamera}
                  disabled={isScanning}
                  variant="outline"
                  className="w-full"
                  data-testid="button-start-camera"
                >
                  {isScanning ? "Câmera Ativa" : "Tentar Novamente"}
                </Button>
                
                <Button
                  onClick={handleManualInput}
                  variant="secondary"
                  className="w-full"
                  data-testid="button-manual-input"
                >
                  Preencher Manualmente
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
