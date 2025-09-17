
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Shield } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { newAdminSchema, type NewAdminData } from "@shared/schema";
import * as z from "zod";

export default function AdminSecret() {
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<boolean>(false);
  const { toast } = useToast();

  // Fetch provinces for selection
  const { data: provinces = [] } = useQuery({
    queryKey: ["/api/provinces"],
  });

  const form = useForm<z.infer<typeof newAdminSchema>>({
    resolver: zodResolver(newAdminSchema),
    defaultValues: {
      name: "",
      email: "",
      username: "",
      provinceId: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof newAdminSchema>) => {
      const response = await apiRequest("POST", "/api/admin/register-emergency", {
        ...data,
        password: "admin123", // Default password - should be changed on first login
        emergencyKey: process.env.NODE_ENV === 'development' ? 'dev-key' : undefined
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao cadastrar administrador");
      }
      return response.json();
    },
    onSuccess: () => {
      setSuccess(true);
      toast({
        title: "Sucesso",
        description: "Administrador cadastrado com sucesso. Password padrão: admin123",
      });

      setTimeout(() => {
        setLocation("/login");
      }, 3000);
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Erro ao cadastrar administrador";
      setError(errorMessage);
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: z.infer<typeof newAdminSchema>) => {
    setError("");
    await mutation.mutateAsync(data);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-gray-100">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-6">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Administrador Cadastrado</h3>
            <p className="text-muted-foreground mb-4">
              O administrador foi cadastrado com sucesso.
            </p>
            <p className="text-sm text-orange-600 font-medium">
              Password padrão: admin123
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Redirecionando para login em 3 segundos...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-red-600" />
            <span>Cadastro de Administrador</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Rota secreta para cadastro de administradores de emergência
          </p>
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
              <Label htmlFor="name">Nome Completo *</Label>
              <Input
                id="name"
                {...form.register("name")}
                placeholder="João Silva Santos"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail *</Label>
              <Input
                id="email"
                type="email"
                {...form.register("email")}
                placeholder="joao@cruzvermelha.ao"
              />
              {form.formState.errors.email && (
                <p className="text-sm text-red-600">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                {...form.register("username")}
                placeholder="joao.silva"
              />
              {form.formState.errors.username && (
                <p className="text-sm text-red-600">{form.formState.errors.username.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="provinceId">Província *</Label>
              <Select
                value={form.watch("provinceId")}
                onValueChange={(value) => form.setValue("provinceId", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a província" />
                </SelectTrigger>
                <SelectContent>
                  {provinces.map((province: any) => (
                    <SelectItem key={province.id} value={province.id}>
                      {province.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.provinceId && (
                <p className="text-sm text-red-600">{form.formState.errors.provinceId.message}</p>
              )}
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Nota:</strong> A password padrão será "admin123". 
                O administrador deve alterá-la no primeiro acesso.
              </AlertDescription>
            </Alert>

            <div className="flex justify-end space-x-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/login")}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? "A cadastrar..." : "Cadastrar Admin"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
