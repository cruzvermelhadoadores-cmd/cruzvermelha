import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, Eye, Users, FileText, Download } from "lucide-react";
import Header from "@/components/header";
import { donorSearchSchema, type DonorSearchData, type Donor } from "@shared/schema";

export default function DonorSearch() {
  const [, setLocation] = useLocation();
  const [searchParams, setSearchParams] = useState<DonorSearchData>({});
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<DonorSearchData>({
    resolver: zodResolver(donorSearchSchema),
    defaultValues: {
      query: "",
      bloodType: "all",
    },
  });
  
  const { data: donors, isLoading } = useQuery<Donor[]>({
    queryKey: ["/api/donors", searchParams],
    meta: { queryParams: searchParams },
  });
  
  const onSubmit = (data: DonorSearchData) => {
    setSearchParams(data);
  };

  const handleExport = async (format: 'csv' | 'xlsx') => {
    try {
      setIsExporting(true);
      
      const query = new URLSearchParams();
      if (searchParams.query) query.append('query', searchParams.query);
      if (searchParams.bloodType && searchParams.bloodType !== 'all') {
        query.append('bloodType', searchParams.bloodType);
      }
      query.append('format', format);
      
      const response = await fetch(`/api/export/donors?${query.toString()}`);
      
      if (!response.ok) {
        throw new Error('Erro ao exportar dados');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const filename = `doadores_${new Date().toISOString().split('T')[0]}.${format}`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Exportação concluída",
        description: `Arquivo ${filename} foi baixado com sucesso.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar os dados. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };
  
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(word => word[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };
  
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Pesquisar Doadores
          </h2>
          <p className="text-muted-foreground">
            Encontre doadores pelo nome, BI ou tipo sanguíneo
          </p>
        </div>
        
        {/* Search Form */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex space-x-4">
              <div className="flex-1">
                <Input
                  {...form.register("query")}
                  placeholder="Pesquisar por nome, BI ou contacto..."
                  data-testid="input-search-query"
                />
              </div>
              <Select
                value={form.watch("bloodType") || "all"}
                onValueChange={(value) => form.setValue("bloodType", value)}
              >
                <SelectTrigger className="w-48" data-testid="select-blood-type">
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
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
              <Button 
                type="submit" 
                disabled={isLoading}
                data-testid="button-search"
              >
                <Search className="w-4 h-4 mr-2" />
                Pesquisar
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Export Buttons */}
        {donors && donors.length > 0 && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Download className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Exportar resultados ({donors.length} doadores):</span>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport('csv')}
                    disabled={isExporting}
                    data-testid="button-export-csv"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport('xlsx')}
                    disabled={isExporting}
                    data-testid="button-export-excel"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Excel
                  </Button>
                </div>
              </div>
              {isExporting && (
                <div className="mt-2 text-xs text-muted-foreground flex items-center">
                  <div className="animate-spin rounded-full h-3 w-3 border-b border-primary mr-2"></div>
                  A exportar dados...
                </div>
              )}
            </CardContent>
          </Card>
        )}
        
        {/* Results */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">A pesquisar...</p>
            </div>
          ) : !donors || donors.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Nenhum doador encontrado
                </h3>
                <p className="text-muted-foreground">
                  Tente alterar os critérios de pesquisa ou cadastrar um novo doador.
                </p>
                <Button 
                  className="mt-4"
                  onClick={() => setLocation("/donors/register")}
                  data-testid="button-register-new-donor"
                >
                  Cadastrar Novo Doador
                </Button>
              </CardContent>
            </Card>
          ) : (
            donors.map((donor) => (
              <Card 
                key={donor.id} 
                className="hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => setLocation(`/donors/${donor.id}`)}
                data-testid={`card-donor-${donor.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center">
                        <span className="text-lg font-semibold text-primary">
                          {getInitials(donor.fullName)}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-card-foreground">
                          {donor.fullName}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          BI: {donor.biNumber}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            Tipo {donor.bloodType}
                          </Badge>
                          <Badge 
                            variant={donor.isAptToDonate ? "default" : "destructive"}
                            className="text-xs"
                          >
                            {donor.isAptToDonate ? "Apto" : "Não Apto"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLocation(`/donors/${donor.id}`);
                        }}
                        data-testid={`button-view-donor-${donor.id}`}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
