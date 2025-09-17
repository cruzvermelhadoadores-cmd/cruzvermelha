import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, CheckCircle, ArrowLeft } from "lucide-react";
import { passwordRecoverySchema, type PasswordRecoveryData } from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";

export default function ForgotPassword() {
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string>("");

  // Fetch provinces for selection
  const { data: provinces = [] } = useQuery({
    queryKey: ["/api/provinces"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const requestReset = useMutation({
    mutationFn: (data: PasswordRecoveryData) => 
      apiRequest("POST", "/api/auth/forgot-password", data),
  });

  const completeReset = useMutation({
    mutationFn: (data: { email: string; token: string; newPassword: string }) =>
      apiRequest("POST", "/api/auth/reset-password-token", data),
  });

  const requestForm = useForm<PasswordRecoveryData>({
    resolver: zodResolver(passwordRecoverySchema),
    defaultValues: {
      email: "",
    },
  });

  const resetForm = useForm({
    defaultValues: {
      token: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onRequestSubmit = async (data: PasswordRecoveryData) => {
    try {
      setError("");
      await requestReset.mutateAsync(data);
      setUserEmail(data.email);
      setStep('reset');
    } catch (err: any) {
      setError(err.message || "Erro ao solicitar recuperação de password");
    }
  };

  const onResetSubmit = async (data: any) => {
    try {
      setError("");
      
      if (data.newPassword !== data.confirmPassword) {
        setError("As passwords não coincidem");
        return;
      }

      if (data.newPassword.length < 6) {
        setError("A password deve ter pelo menos 6 caracteres");
        return;
      }

      await completeReset.mutateAsync({
        email: userEmail,
        token: data.token,
        newPassword: data.newPassword,
      });
      
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Erro ao redefinir password");
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Password Redefinida</h2>
              <p className="text-muted-foreground mb-4">
                A sua password foi redefinida com sucesso. Pode agora fazer login com a nova password.
              </p>
              <Link href="/">
                <Button className="w-full" data-testid="button-back-to-login">
                  Voltar ao Login
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img
              src="https://imgur.com/V4f4OIL.jpg"
              alt="Cruz Vermelha Angola"
              className="h-20 w-20 object-box-content"
            />
          </div>
          <CardTitle className="text-xl font-semibold">
            {step === 'request' ? 'Recuperar Password' : 'Redefinir Password'}
          </CardTitle>
          <CardDescription>
            {step === 'request' 
              ? 'Introduza o seu email para receber instruções de recuperação'
              : 'Introduza o código recebido por email e a nova password'
            }
          </CardDescription>
        </CardHeader>

        <CardContent>
          {step === 'request' ? (
            <form onSubmit={requestForm.handleSubmit(onRequestSubmit)} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  data-testid="input-recovery-email"
                  {...requestForm.register("email")}
                  placeholder="Introduza o seu email"
                />
                {requestForm.formState.errors.email && (
                  <p className="text-sm text-red-600">
                    {requestForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="province">Província (opcional)</Label>
                <Select
                  value={requestForm.watch("provinceId") || ""}
                  onValueChange={(value) => requestForm.setValue("provinceId", value || undefined)}
                >
                  <SelectTrigger data-testid="select-recovery-province">
                    <SelectValue placeholder="Selecione a sua província" />
                  </SelectTrigger>
                  <SelectContent>
                    {provinces.map((province: any) => (
                      <SelectItem key={province.id} value={province.id}>
                        {province.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Selecione a província para validação adicional
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                data-testid="button-request-reset"
                disabled={requestReset.isPending}
              >
                {requestReset.isPending ? "A enviar..." : "Enviar Instruções"}
              </Button>

              <div className="text-center">
                <Link href="/">
                  <span className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800">
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Voltar ao Login
                  </span>
                </Link>
              </div>
            </form>
          ) : (
            <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Enviámos instruções de recuperação para <strong>{userEmail}</strong>. 
                  Verifique o seu email e introduza o código recebido.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="token">Código de Recuperação</Label>
                <Input
                  id="token"
                  data-testid="input-reset-token"
                  {...resetForm.register("token")}
                  placeholder="Introduza o código de 32 caracteres"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  data-testid="input-new-password"
                  {...resetForm.register("newPassword")}
                  placeholder="Introduza a nova password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  data-testid="input-confirm-password"
                  {...resetForm.register("confirmPassword")}
                  placeholder="Confirme a nova password"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                data-testid="button-complete-reset"
                disabled={completeReset.isPending}
              >
                {completeReset.isPending ? "A redefinir..." : "Redefinir Password"}
              </Button>

              <div className="text-center space-y-2">
                <button
                  type="button"
                  onClick={() => setStep('request')}
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                  data-testid="button-back-to-request"
                >
                  Não recebeu o email? Tentar novamente
                </button>
                <div>
                  <Link href="/">
                    <span className="inline-flex items-center text-sm text-gray-600 hover:text-gray-800">
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      Voltar ao Login
                    </span>
                  </Link>
                </div>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}