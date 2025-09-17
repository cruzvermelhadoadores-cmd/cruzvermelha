import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle } from "lucide-react";
import { useResetPassword } from "@/lib/auth";
import { resetPasswordSchema, type ResetPasswordData } from "@shared/schema";
import { useQueryClient } from "@tanstack/react-query";

export default function ResetPassword() {
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<boolean>(false);
  const resetPassword = useResetPassword();
  const queryClient = useQueryClient();
  
  const form = useForm<ResetPasswordData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });
  
  const onSubmit = async (data: ResetPasswordData) => {
    try {
      setError("");
      await resetPassword.mutateAsync(data);
      setSuccess(true);
      
      // Refresh auth data
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Erro ao alterar password");
    }
  };
  
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Password Alterada</h2>
              <p className="text-muted-foreground">
                A sua password foi alterada com sucesso. Será redirecionado em breve.
              </p>
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
              src="https://i.imgur.com/uUfCICT.jpg" 
              alt="Cruz Vermelha Angola" 
              className="h-16 w-16 object-contain"
            />
          </div>
          <CardTitle className="text-xl font-semibold">Definir Nova Password</CardTitle>
          <CardDescription>
            Por favor, defina uma nova password para continuar a usar o sistema.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Password Atual</Label>
              <Input
                id="currentPassword"
                type="password"
                data-testid="input-current-password"
                {...form.register("currentPassword")}
                placeholder="Introduza a password provisória"
              />
              {form.formState.errors.currentPassword && (
                <p className="text-sm text-red-600">{form.formState.errors.currentPassword.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova Password</Label>
              <Input
                id="newPassword"
                type="password"
                data-testid="input-new-password"
                {...form.register("newPassword")}
                placeholder="Introduza a nova password"
              />
              {form.formState.errors.newPassword && (
                <p className="text-sm text-red-600">{form.formState.errors.newPassword.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                data-testid="input-confirm-password"
                {...form.register("confirmPassword")}
                placeholder="Confirme a nova password"
              />
              {form.formState.errors.confirmPassword && (
                <p className="text-sm text-red-600">{form.formState.errors.confirmPassword.message}</p>
              )}
            </div>
            
            <Button 
              type="submit" 
              className="w-full"
              data-testid="button-reset-password"
              disabled={resetPassword.isPending}
            >
              {resetPassword.isPending ? "A alterar..." : "Alterar Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
