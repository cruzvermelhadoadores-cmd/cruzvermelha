
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Filter, X } from "lucide-react";
import { donorSearchSchema, type DonorSearchData } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";

interface AdvancedFiltersProps {
  onFiltersChange: (filters: DonorSearchData) => void;
  initialFilters?: DonorSearchData;
}

export default function AdvancedFilters({ onFiltersChange, initialFilters }: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: authData } = useAuth();
  const user = authData?.user;
  const isAdmin = user?.role === "admin";

  const { data: provinces = [] } = useQuery({
    queryKey: ["/api/provinces"],
    enabled: isAdmin,
  });

  const form = useForm<DonorSearchData>({
    resolver: zodResolver(donorSearchSchema),
    defaultValues: {
      query: "",
      bloodType: undefined,
      gender: undefined,
      municipality: "",
      ageMin: undefined,
      ageMax: undefined,
      isAptToDonate: undefined,
      availableForFuture: undefined,
      department: undefined,
      hasHistory: undefined,
      provinceId: undefined,
      createdDateFrom: "",
      createdDateTo: "",
      lastDonationFrom: "",
      lastDonationTo: "",
      sortBy: "createdAt",
      sortOrder: "desc",
      ...initialFilters,
    },
  });

  const watchedValues = form.watch();
  
  const activeFiltersCount = Object.entries(watchedValues).filter(([key, value]) => {
    if (key === "sortBy" || key === "sortOrder") return false;
    return value !== undefined && value !== "" && value !== null;
  }).length;

  const handleSubmit = (data: DonorSearchData) => {
    // Clean up empty values
    const cleanedData = Object.entries(data).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== "" && value !== null) {
        acc[key as keyof DonorSearchData] = value;
      }
      return acc;
    }, {} as DonorSearchData);
    
    onFiltersChange(cleanedData);
  };

  const handleReset = () => {
    form.reset({
      query: "",
      bloodType: undefined,
      gender: undefined,
      municipality: "",
      ageMin: undefined,
      ageMax: undefined,
      isAptToDonate: undefined,
      availableForFuture: undefined,
      department: undefined,
      hasHistory: undefined,
      provinceId: undefined,
      createdDateFrom: "",
      createdDateTo: "",
      lastDonationFrom: "",
      lastDonationTo: "",
      sortBy: "createdAt",
      sortOrder: "desc",
    });
    onFiltersChange({});
  };

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Filter className="w-5 h-5" />
                <CardTitle className="text-lg">Filtros Avançados</CardTitle>
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {activeFiltersCount} filtro{activeFiltersCount !== 1 ? 's' : ''} ativo{activeFiltersCount !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
              {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* Basic Search */}
              <div className="space-y-4">
                <h4 className="font-medium text-foreground border-b pb-2">Busca Básica</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="query">Busca por Nome, BI ou Contacto</Label>
                    <Input
                      id="query"
                      {...form.register("query")}
                      placeholder="Digite para buscar..."
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="municipality">Município</Label>
                    <Input
                      id="municipality"
                      {...form.register("municipality")}
                      placeholder="Nome do município"
                    />
                  </div>
                </div>
              </div>

              {/* Medical Filters */}
              <div className="space-y-4">
                <h4 className="font-medium text-foreground border-b pb-2">Filtros Médicos</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bloodType">Tipo Sanguíneo</Label>
                    <Select
                      value={form.watch("bloodType") || ""}
                      onValueChange={(value) => form.setValue("bloodType", value || undefined)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos os tipos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todos os tipos</SelectItem>
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
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="isAptToDonate">Status de Doação</Label>
                    <Select
                      value={form.watch("isAptToDonate")?.toString() || ""}
                      onValueChange={(value) => form.setValue("isAptToDonate", value === "" ? undefined : value === "true")}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todos</SelectItem>
                        <SelectItem value="true">Apto para doar</SelectItem>
                        <SelectItem value="false">Não apto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="hasHistory">Histórico de Doações</Label>
                    <Select
                      value={form.watch("hasHistory")?.toString() || ""}
                      onValueChange={(value) => form.setValue("hasHistory", value === "" ? undefined : value === "true")}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todos</SelectItem>
                        <SelectItem value="true">Com histórico</SelectItem>
                        <SelectItem value="false">Sem histórico</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Demographics */}
              <div className="space-y-4">
                <h4 className="font-medium text-foreground border-b pb-2">Demografia</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gênero</Label>
                    <Select
                      value={form.watch("gender") || ""}
                      onValueChange={(value) => form.setValue("gender", value as "M" | "F" | undefined)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todos</SelectItem>
                        <SelectItem value="M">Masculino</SelectItem>
                        <SelectItem value="F">Feminino</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="ageMin">Idade Mínima</Label>
                    <Input
                      id="ageMin"
                      type="number"
                      {...form.register("ageMin", { valueAsNumber: true })}
                      placeholder="18"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="ageMax">Idade Máxima</Label>
                    <Input
                      id="ageMax"
                      type="number"
                      {...form.register("ageMax", { valueAsNumber: true })}
                      placeholder="65"
                    />
                  </div>
                </div>
              </div>

              {/* Professional Info */}
              <div className="space-y-4">
                <h4 className="font-medium text-foreground border-b pb-2">Informação Profissional</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="department">Departamento</Label>
                    <Select
                      value={form.watch("department") || ""}
                      onValueChange={(value) => form.setValue("department", value || undefined)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos os departamentos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todos</SelectItem>
                        <SelectItem value="delegacao">Delegação Provincial</SelectItem>
                        <SelectItem value="programas">Programa e Serviços</SelectItem>
                        <SelectItem value="juventude">Juventude e Voluntariado</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {isAdmin && (
                    <div className="space-y-2">
                      <Label htmlFor="provinceId">Província</Label>
                      <Select
                        value={form.watch("provinceId") || ""}
                        onValueChange={(value) => form.setValue("provinceId", value || undefined)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todas as províncias" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Todas</SelectItem>
                          {provinces.map((province: any) => (
                            <SelectItem key={province.id} value={province.id}>
                              {province.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>

              {/* Date Ranges */}
              <div className="space-y-4">
                <h4 className="font-medium text-foreground border-b pb-2">Períodos</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Data de Cadastro</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="createdDateFrom" className="text-xs">De</Label>
                        <Input
                          id="createdDateFrom"
                          type="date"
                          {...form.register("createdDateFrom")}
                        />
                      </div>
                      <div>
                        <Label htmlFor="createdDateTo" className="text-xs">Até</Label>
                        <Input
                          id="createdDateTo"
                          type="date"
                          {...form.register("createdDateTo")}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Última Doação</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="lastDonationFrom" className="text-xs">De</Label>
                        <Input
                          id="lastDonationFrom"
                          type="date"
                          {...form.register("lastDonationFrom")}
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastDonationTo" className="text-xs">Até</Label>
                        <Input
                          id="lastDonationTo"
                          type="date"
                          {...form.register("lastDonationTo")}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sorting */}
              <div className="space-y-4">
                <h4 className="font-medium text-foreground border-b pb-2">Ordenação</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sortBy">Ordenar por</Label>
                    <Select
                      value={form.watch("sortBy") || "createdAt"}
                      onValueChange={(value) => form.setValue("sortBy", value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Ordenar por" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name">Nome</SelectItem>
                        <SelectItem value="age">Idade</SelectItem>
                        <SelectItem value="bloodType">Tipo Sanguíneo</SelectItem>
                        <SelectItem value="createdAt">Data de Cadastro</SelectItem>
                        <SelectItem value="lastDonation">Última Doação</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="sortOrder">Ordem</Label>
                    <Select
                      value={form.watch("sortOrder") || "desc"}
                      onValueChange={(value) => form.setValue("sortOrder", value as "asc" | "desc")}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Ordem" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asc">Crescente</SelectItem>
                        <SelectItem value="desc">Decrescente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between pt-4 border-t">
                <Button type="button" variant="outline" onClick={handleReset}>
                  <X className="w-4 h-4 mr-2" />
                  Limpar Filtros
                </Button>
                <Button type="submit">
                  <Filter className="w-4 h-4 mr-2" />
                  Aplicar Filtros
                </Button>
              </div>
            </form>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
