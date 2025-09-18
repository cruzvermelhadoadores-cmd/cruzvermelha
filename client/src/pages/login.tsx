import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle } from "lucide-react";
import { useLogin } from "@/lib/auth";
import { loginSchema, type LoginData } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";

export default function Login() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstall, setShowInstall] = useState(false);

  // Detecta o evento de instalação do PWA
  React.useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);
  const [error, setError] = useState<string>("");
  const [showProvinceSelect, setShowProvinceSelect] = useState<boolean>(false);
  const login = useLogin();

  // Fetch provinces for selection
  const { data: provinces = [] } = useQuery({
    queryKey: ["/api/provinces"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const form = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
      provinceId: undefined,
    },
  });

  const onSubmit = async (data: LoginData) => {
    try {
      setError("");
      await login.mutateAsync(data);
    } catch (err: any) {
      setError(err.message || "Erro ao fazer login");
    }
  };

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
            Cruz Vermelha Angola
          </CardTitle>
          <CardDescription>Sistema de Gestão de Doadores</CardDescription>
        </CardHeader>

        <CardContent>
          {showInstall && (
            <Button
              className="w-full mb-2"
              onClick={async () => {
                if (deferredPrompt) {
                  deferredPrompt.prompt();
                  const choiceResult = await deferredPrompt.userChoice;
                  setShowInstall(false);
                  setDeferredPrompt(null);
                }
              }}
            >
              Instalar aplicativo para uso offline
            </Button>
          )}
          
          
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">Nome de Utilizador</Label>
              <Input
                id="username"
                data-testid="input-username"
                {...form.register("username")}
                placeholder="Introduza o seu nome ou email"
              />
              {form.formState.errors.username && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.username.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                data-testid="input-password"
                {...form.register("password")}
                placeholder="Introduza a sua password"
              />
              {form.formState.errors.password && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            {showProvinceSelect && (
              <div className="space-y-2">
                <Label htmlFor="province">Província (Líderes)</Label>
                <Select
                  value={form.watch("provinceId") || ""}
                  onValueChange={(value) => form.setValue("provinceId", value || undefined)}
                >
                  <SelectTrigger data-testid="select-province">
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
                {form.formState.errors.provinceId && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.provinceId.message}
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => setShowProvinceSelect(!showProvinceSelect)}
                className="text-blue-600 hover:text-blue-800 underline"
                data-testid="button-toggle-province"
              >
                {showProvinceSelect ? "Sou Admin" : "Sou Líder"}
              </button>
              <Link href="/forgot-password">
                <span className="text-blue-600 hover:text-blue-800 underline" data-testid="link-forgot-password">
                  Esqueceu a password?
                </span>
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full"
              data-testid="button-login"
              disabled={login.isPending}
            >
              {login.isPending ? "A entrar..." : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
