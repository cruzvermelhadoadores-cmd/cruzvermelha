import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Mail } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { newLeaderSchema, type NewLeaderData } from "@shared/schema";
import * as z from "zod";

interface LeaderFormProps {
  onSuccess: () => void;
  initialData?: any;
  userId?: string;
}

export default function LeaderForm({ onSuccess, initialData, userId }: LeaderFormProps) {
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<boolean>(false);
  const { toast } = useToast();

  const isEdit = Boolean(userId && initialData);

  // Fetch provinces for selection
  const { data: provinces = [] } = useQuery({
    queryKey: ["/api/provinces"],
  });

  const form = useForm<z.infer<typeof newLeaderSchema>>({
    resolver: zodResolver(newLeaderSchema),
    defaultValues: {
      name: initialData?.name || "",
      email: initialData?.email || "",
      provinceId: initialData?.provinceId || "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof newLeaderSchema>) => {
      const url = userId ? `/api/leaders/${userId}` : "/api/leaders";
      const method = userId ? "PUT" : "POST";
      const response = await apiRequest(method, url, data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Erro ao ${isEdit ? 'atualizar' : 'cadastrar'} líder`);
      }
      return response.json();
    },
    onSuccess: (data) => {
      setSuccess(true);
      toast({
        title: "Sucesso",
        description: userId ? "Utilizador atualizado com sucesso" : "Líder cadastrado com sucesso. Senha provisória enviada por email.",
      });

      // Close form after 2 seconds to show success message
      setTimeout(() => {
        onSuccess();
        setSuccess(false);
        form.reset();
      }, 2000);
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Erro ao cadastrar líder";
      setError(errorMessage);

      // Show custom toast for duplicate email error
      if (errorMessage.includes("email já existe")) {
        toast({
          title: "Email Já Cadastrado",
          description: "Este email já está sendo usado por outro utilizador. Por favor, use um email diferente.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro",
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
  });

  const onSubmit = async (data: z.infer<typeof newLeaderSchema>) => {
    setError("");
    await mutation.mutateAsync(data);
  };

  if (success) {
    return (
      <div className="text-center py-6">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">
          {isEdit ? "Líder Atualizado" : "Líder Cadastrado"}
        </h3>
        <p className="text-muted-foreground">
          {isEdit 
            ? "As informações do líder foram atualizadas com sucesso."
            : "O novo líder foi cadastrado com sucesso e receberá uma senha provisória por email."
          }
        </p>
      </div>
    );
  }

  return (
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
          data-testid="input-leader-name"
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
          data-testid="input-leader-email"
        />
        {form.formState.errors.email && (
          <p className="text-sm text-red-600">{form.formState.errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="provinceId">Província *</Label>
        <Select
          value={form.watch("provinceId")}
          onValueChange={(value) => form.setValue("provinceId", value)}
        >
          <SelectTrigger data-testid="select-leader-province">
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

      {!isEdit && (
        <Alert>
          <Mail className="h-4 w-4" />
          <AlertDescription>
            <strong>Nota:</strong> Uma senha provisória será enviada automaticamente 
            para o e-mail fornecido. O novo líder deverá alterar a senha no primeiro acesso.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end space-x-4 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onSuccess}
          data-testid="button-cancel-leader"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={mutation.isPending}
          data-testid="button-submit-leader"
        >
          {mutation.isPending 
            ? (isEdit ? "A atualizar..." : "A cadastrar...") 
            : (isEdit ? "Atualizar" : "Cadastrar")
          }
        </Button>
      </div>
    </form>
  );
}