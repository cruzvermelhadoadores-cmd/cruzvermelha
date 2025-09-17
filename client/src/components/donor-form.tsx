import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { donorFormSchema, type DonorFormData, type InsertDonor } from "@shared/schema";

interface DonorFormProps {
  initialData?: Partial<DonorFormData>;
  donorId?: string;
  onSuccess: () => void;
}

export default function DonorForm({ initialData, donorId, onSuccess }: DonorFormProps) {
  const [error, setError] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get user data for default province
  const { data: authData } = useQuery({
    queryKey: ["/api/auth/me"],
  });

  const form = useForm<DonorFormData>({
    resolver: zodResolver(donorFormSchema),
    defaultValues: {
      hasHistory: false,
      previousDonations: 0,
      isAptToDonate: true,
      availableForFuture: true,
      preferredContact: "call",
      neighborhood: "",
      contact: "",
      position: "",
      department: "",
      lastDonation: "",
      medicalRestrictions: "",
      observations: "",
      provinceId: (authData as any)?.user?.provinceId || "",
      ...initialData,
    },
    mode: "onChange",
  });

  // Fetch provinces for admin users
  const { data: provinces = [] } = useQuery({
    queryKey: ["/api/provinces"],
  }) as { data: Array<{ id: string; name: string }> };

  const mutation = useMutation({
    mutationFn: async (data: DonorFormData) => {
      // Prepare data for submission
      const submissionData = {
        ...data,
        provinceId: data.provinceId || (authData as any)?.user?.provinceId || "",
      };

      const url = donorId ? `/api/donors/${donorId}` : "/api/donors";
      const method = donorId ? "PUT" : "POST";
      const response = await apiRequest(method, url, submissionData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/donors"] });
      toast({
        title: "Sucesso",
        description: donorId ? "Doador atualizado com sucesso" : "Doador cadastrado com sucesso",
      });
      onSuccess();
    },
    onError: (error: any) => {
      setError(error.message || "Erro ao processar dados");
    },
  });

  // Calculate age when birth date changes
  const birthDate = form.watch("birthDate");
  
  useEffect(() => {
    if (birthDate) {
      const today = new Date();
      const birth = new Date(birthDate);
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      
      form.setValue("age", age);
    }
  }, [birthDate, form]);

  const onSubmit = async (data: DonorFormData) => {
    try {
      setError("");
      await mutation.mutateAsync(data);
    } catch (error) {
      console.error("Form submission error:", error);
      setError("Erro ao processar formulário. Verifique os dados e tente novamente.");
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Section 1: Identification */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-foreground border-b pb-2">
          1 Identificação do Doador
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="biNumber">Nº de Identificação (BI) *</Label>
            <Input
              id="biNumber"
              {...form.register("biNumber")}
              placeholder="123456789LA"
              data-testid="input-bi-number"
            />
            {form.formState.errors.biNumber && (
              <p className="text-sm text-red-600">{form.formState.errors.biNumber.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Nome Completo *</Label>
            <Input
              id="fullName"
              {...form.register("fullName")}
              placeholder="Maria Santos Silva"
              data-testid="input-full-name"
            />
            {form.formState.errors.fullName && (
              <p className="text-sm text-red-600">{form.formState.errors.fullName.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="birthDate">Data de Nascimento *</Label>
            <Input
              id="birthDate"
              type="date"
              {...form.register("birthDate")}
              data-testid="input-birth-date"
            />
            {form.formState.errors.birthDate && (
              <p className="text-sm text-red-600">{form.formState.errors.birthDate.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="age">Idade</Label>
            <Input
              id="age"
              type="number"
              {...form.register("age", { valueAsNumber: true })}
              placeholder="Calculada automaticamente"
              readOnly
              className="bg-muted"
              data-testid="input-age"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gender">Sexo *</Label>
            <Select
              value={form.watch("gender")}
              onValueChange={(value) => form.setValue("gender", value as "M" | "F")}
            >
              <SelectTrigger data-testid="select-gender">
                <SelectValue placeholder="Selecionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="M">Masculino</SelectItem>
                <SelectItem value="F">Feminino</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.gender && (
              <p className="text-sm text-red-600">{form.formState.errors.gender.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="municipality">Município *</Label>
            <Input
              id="municipality"
              {...form.register("municipality")}
              placeholder="Lubango"
              data-testid="input-municipality"
            />
            {form.formState.errors.municipality && (
              <p className="text-sm text-red-600">{form.formState.errors.municipality.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="neighborhood">Bairro</Label>
            <Input
              id="neighborhood"
              {...form.register("neighborhood")}
              placeholder="Tchioco"
              data-testid="input-neighborhood"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contact">Contacto</Label>
            <Input
              id="contact"
              type="tel"
              {...form.register("contact")}
              placeholder="+244 900 000 000"
              data-testid="input-contact"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="position">Cargo/Função</Label>
            <Input
              id="position"
              {...form.register("position")}
              placeholder="Enfermeiro"
              data-testid="input-position"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="department">Departamento/Setor</Label>
          <Select
            value={form.watch("department") || ""}
            onValueChange={(value) => form.setValue("department", value)}
          >
            <SelectTrigger data-testid="select-department">
              <SelectValue placeholder="Selecionar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="delegacao">Delegação Provincial</SelectItem>
              <SelectItem value="programas">Programa e Serviços</SelectItem>
              <SelectItem value="juventude">Juventude e Voluntariado</SelectItem>
              <SelectItem value="outro">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Add Province field */}
        <div className="space-y-2">
          <Label htmlFor="provinceId">Província *</Label>
          <Select
            value={form.watch("provinceId") || ""}
            onValueChange={(value) => {
              form.setValue("provinceId", value);
              form.clearErrors("provinceId");
            }}
          >
            <SelectTrigger data-testid="select-province">
              <SelectValue placeholder="Selecionar Província" />
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
      </div>

      {/* Section 2: Medical Information */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-foreground border-b pb-2">
          2 Informação Médica e de Doação
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="bloodType">Grupo Sanguíneo *</Label>
            <Select
              value={form.watch("bloodType")}
              onValueChange={(value) => form.setValue("bloodType", value as "O+" | "O-" | "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-")}
            >
              <SelectTrigger data-testid="select-blood-type">
                <SelectValue placeholder="Selecionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="O+">O+</SelectItem>
                <SelectItem value="O-">O-</SelectItem>
                <SelectItem value="A+">A+</SelectItem>
                <SelectItem value="A-">A-</SelectItem>
                <SelectItem value="B+">B+</SelectItem>
                <SelectItem value="B-">B-</SelectItem>
                <SelectItem value="AB+">AB+</SelectItem>
                <SelectItem value="AB-">AB-</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.bloodType && (
              <p className="text-sm text-red-600">{form.formState.errors.bloodType.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="rhFactor">Fator Rh *</Label>
            <Select
              value={form.watch("rhFactor")}
              onValueChange={(value) => form.setValue("rhFactor", value as "positive" | "negative")}
            >
              <SelectTrigger data-testid="select-rh-factor">
                <SelectValue placeholder="Selecionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="positive">Positivo</SelectItem>
                <SelectItem value="negative">Negativo</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.rhFactor && (
              <p className="text-sm text-red-600">{form.formState.errors.rhFactor.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="hasHistory"
              checked={form.watch("hasHistory")}
              onCheckedChange={(checked) => form.setValue("hasHistory", checked)}
              data-testid="switch-has-history"
            />
            <Label htmlFor="hasHistory">Histórico de doações</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="previousDonations">Nº de doações anteriores</Label>
            <Input
              id="previousDonations"
              type="number"
              {...form.register("previousDonations", { valueAsNumber: true })}
              placeholder="0"
              data-testid="input-previous-donations"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastDonation">Última doação</Label>
            <Input
              id="lastDonation"
              type="date"
              {...form.register("lastDonation")}
              data-testid="input-last-donation"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="medicalRestrictions">Restrições médicas conhecidas</Label>
          <Textarea
            id="medicalRestrictions"
            {...form.register("medicalRestrictions")}
            placeholder="Descreva quaisquer restrições médicas conhecidas"
            data-testid="textarea-medical-restrictions"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="isAptToDonate"
            checked={form.watch("isAptToDonate")}
            onCheckedChange={(checked) => form.setValue("isAptToDonate", checked)}
            data-testid="switch-apt-to-donate"
          />
          <Label htmlFor="isAptToDonate">Apto para doar</Label>
        </div>
      </div>

      {/* Section 3: Availability */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-foreground border-b pb-2">
          3. Disponibilidade
        </h4>

        <div className="flex items-center space-x-2">
          <Switch
            id="availableForFuture"
            checked={form.watch("availableForFuture")}
            onCheckedChange={(checked) => form.setValue("availableForFuture", checked)}
            data-testid="switch-available-future"
          />
          <Label htmlFor="availableForFuture">Disponível para futuras doações</Label>
        </div>

        <div className="space-y-2">
          <Label htmlFor="preferredContact">Melhor forma de contacto</Label>
          <Select
            value={form.watch("preferredContact")}
            onValueChange={(value) => form.setValue("preferredContact", value as "call" | "sms" | "email" | "whatsapp")}
          >
            <SelectTrigger data-testid="select-preferred-contact">
              <SelectValue placeholder="Selecionar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="call">Chamada</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="observations">Observações adicionais</Label>
          <Textarea
            id="observations"
            {...form.register("observations")}
            placeholder="Informações adicionais relevantes"
            data-testid="textarea-observations"
          />
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-4 pt-6 border-t">
        <Button
          type="submit"
          disabled={mutation.isPending}
          data-testid="button-submit-donor"
        >
          {mutation.isPending ? "A processar..." : donorId ? "Atualizar" : "Cadastrar"}
        </Button>
      </div>
    </form>
  );
}