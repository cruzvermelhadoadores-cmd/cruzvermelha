import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Users, 
  Heart, 
  CheckCircle, 
  Calendar, 
  UserPlus, 
  Edit,
  Trash2,
  BarChart3,
  TrendingUp,
  Activity,
  Download,
  FileText,
  AlertTriangle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/header";
import LeaderForm from "@/components/leader-form";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";

interface StatsData {
  totalDonors: number;
  totalDonations: number;
  activeDonors: number;
  newThisMonth: number;
  bloodTypeStats: Record<string, { count: number; percentage: number }>;
}

interface Leader {
  id: string;
  name: string;
  email: string;
  phone?: string;
  // Add other leader properties as needed
}

export default function Reports() {
  const [, setLocation] = useLocation();
  const [showLeaderForm, setShowLeaderForm] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [leaderToDelete, setLeaderToDelete] = useState<{id: string, name: string} | null>(null);
  const { data: authData } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const user = authData?.user;
  const isAdmin = user?.role === "admin";

  // Redirect non-admin users
  if (!isAdmin) {
    setLocation("/");
    return null;
  }

  const { data: stats, isLoading: statsLoading } = useQuery<StatsData>({
    queryKey: ["/api/stats"],
  });

  const { data: recentDonations } = useQuery<Array<{
    id: string;
    donorName: string;
    bloodType: string;
    donationDate: string;
    donationTime: string;
  }>>({
    queryKey: ["/api/donations/recent"],
    meta: { queryParams: { limit: "10" } },
  });

  const leadersQuery = useQuery<Leader[]>({
    queryKey: ["/api/leaders"],
    enabled: user?.role === "admin",
  });

  const bloodTypeColors = [
    "bg-primary",
    "bg-accent-foreground", 
    "bg-secondary-foreground",
    "bg-muted-foreground",
    "bg-chart-2",
    "bg-chart-3",
    "bg-chart-4",
    "bg-chart-5"
  ];

  const deleteLeaderMutation = useMutation({
    mutationFn: async (leaderId: string) => {
      const response = await fetch(`/api/leaders/${leaderId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao eliminar líder');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leaders"] });
      toast({
        title: "Sucesso",
        description: "Líder eliminado com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao eliminar líder",
        variant: "destructive",
      });
    },
  });

  const handleDeleteLeader = (leaderId: string, leaderName: string) => {
    setLeaderToDelete({ id: leaderId, name: leaderName });
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteLeader = () => {
    if (leaderToDelete) {
      deleteLeaderMutation.mutate(leaderToDelete.id);
    }
    setDeleteConfirmOpen(false);
    setLeaderToDelete(null);
  };

  const handleExportReport = async (format: 'csv' | 'xlsx', type: 'overview' | 'bloodtype' | 'monthly' = 'overview') => {
    try {
      setIsExporting(true);

      const query = new URLSearchParams();
      query.append('type', type);
      query.append('format', format);

      const response = await fetch(`/api/export/reports?${query.toString()}`);

      if (!response.ok) {
        throw new Error('Erro ao exportar relatório');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      const filename = `relatorio_${type}_${new Date().toISOString().split('T')[0]}.${format}`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Exportação concluída",
        description: `Relatório ${filename} foi baixado com sucesso.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar o relatório. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Relatórios e Análises
          </h2>
          <p className="text-muted-foreground">
            Estatísticas detalhadas e gestão de líderes
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" data-testid="tab-overview">
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="donors" data-testid="tab-donors">
              Doadores
            </TabsTrigger>
            <TabsTrigger value="donations" data-testid="tab-donations">
              Doações
            </TabsTrigger>
            <TabsTrigger value="leaders" data-testid="tab-leaders">
              Gerir Líderes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card data-testid="card-total-donors">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-accent rounded-lg">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-card-foreground">
                        {statsLoading ? "..." : stats?.totalDonors || 0}
                      </p>
                      <p className="text-sm text-muted-foreground">Total de Doadores</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-total-donations">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-accent rounded-lg">
                      <Heart className="w-5 h-5 text-accent-foreground" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-card-foreground">
                        {statsLoading ? "..." : stats?.totalDonations || 0}
                      </p>
                      <p className="text-sm text-muted-foreground">Total de Doações</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-active-donors">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-card-foreground">
                        {statsLoading ? "..." : stats?.activeDonors || 0}
                      </p>
                      <p className="text-sm text-muted-foreground">Doadores Ativos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-monthly-new">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-black/10 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-secondary-foreground" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-card-foreground">
                        {statsLoading ? "..." : stats?.newThisMonth || 0}
                      </p>
                      <p className="text-sm text-muted-foreground">Este Mês</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Admin Actions Section */}
            <Card>
              <CardHeader>
                <CardTitle>Ações Administrativas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Dialog open={showLeaderForm} onOpenChange={setShowLeaderForm}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="flex items-center justify-between p-10 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                        data-testid="button-create-leader"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <UserPlus className="w-5 h-5 text-primary" />
                          </div>
                          <div className="text-left">
                            <p className="font-medium text-foreground">Cadastrar Líder</p>
                            {/* <p className="text-sm text-muted-foreground ">
                              Adicionar novo líder ao sistema
                            </p> */}
                          </div>
                        </div>
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Cadastrar Novo Líder</DialogTitle>
                      </DialogHeader>
                      <LeaderForm
                        onSuccess={() => setShowLeaderForm(false)}
                      />
                    </DialogContent>
                  </Dialog>

                  <Button
                    variant="outline"
                    className="flex items-center justify-between p-10 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                    onClick={() => setLocation("/donors/search")}
                    data-testid="button-manage-donors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-accent rounded-lg">
                        <Edit className="w-5 h-5 text-accent-foreground" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-foreground">Gerir Doadores</p>
                        {/* <p className="text-sm text-muted-foreground">
                          Editar e eliminar doadores
                        </p> */}
                      </div>
                    </div>
                  </Button>

                  {/* Export Reports */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Download className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-foreground">Exportar Relatórios</p>
                          <p className="text-sm text-muted-foreground">
                            Baixar dados em CSV ou Excel
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExportReport('csv')}
                        disabled={isExporting}
                        data-testid="button-export-report-csv"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        CSV
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExportReport('xlsx')}
                        disabled={isExporting}
                        data-testid="button-export-report-excel"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Excel
                      </Button>
                    </div>
                    {isExporting && (
                      <div className="text-xs text-muted-foreground flex items-center">
                        <div className="animate-spin rounded-full h-3 w-3 border-b border-primary mr-2"></div>
                        A exportar relatório...
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="donors" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Blood Type Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    Estatísticas por Tipo Sanguíneo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats?.bloodTypeStats && Object.entries(stats.bloodTypeStats).map(([type, data], index) => (
                      <div key={type} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-4 h-4 rounded-full ${bloodTypeColors[index] || 'bg-primary'}`}></div>
                          <span className="font-medium text-card-foreground">
                            Tipo {type}
                          </span>
                        </div>
                        <div className="text-right">
                          <span 
                            className="font-semibold text-card-foreground"
                            data-testid={`stat-blood-type-${type}-count`}
                          >
                            {data.count}
                          </span>
                          <div className="w-24 bg-muted rounded-full h-2 mt-1">
                            <div 
                              className={`h-2 rounded-full ${bloodTypeColors[index] || 'bg-primary'}`}
                              style={{ width: `${data.percentage}%` }}
                              data-testid={`stat-blood-type-${type}-bar`}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    Estatísticas Rápidas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Taxa de Doadores Ativos</span>
                    <Badge variant="secondary">
                      {stats?.totalDonors && stats.activeDonors 
                        ? Math.round((stats.activeDonors / stats.totalDonors) * 100)
                        : 0}%
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Crescimento Mensal</span>
                    <Badge variant="default">
                      +{stats?.newThisMonth || 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Média de Doações</span>
                    <Badge variant="outline">
                      {stats?.totalDonors && stats.totalDonations 
                        ? (stats.totalDonations / stats.totalDonors).toFixed(1)
                        : "0.0"} por doador
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="donations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  Doações Recentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentDonations && recentDonations.length > 0 ? (
                    recentDonations.map((donation, index: number) => (
                      <div 
                        key={donation.id}
                        className="flex items-center space-x-4 p-3 bg-muted/50 rounded-lg"
                        data-testid={`recent-donation-${index}`}
                      >
                        <div className="w-10 h-10 bg-black/5 rounded-full flex items-center justify-center">
                          <Heart className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-card-foreground">
                            {donation.donorName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Tipo {donation.bloodType}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-card-foreground">
                            {new Date(donation.donationDate).toLocaleDateString('pt-AO')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {donation.donationTime}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Heart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhuma doação registrada</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leaders" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  Gestão de Líderes
                  <div className="ml-auto">
                  </div>
                  <Button onClick={() => setShowLeaderForm(true)} data-testid="button-add-leader">
                    <UserPlus className="w-4 h-4 mr-2" />
                     <h1 className="hidden sm:block">Adicionar Novo Líder</h1>
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {leadersQuery.isLoading ? (
                  <p>Carregando líderes...</p>
                ) : leadersQuery.error ? (
                  <p className="text-red-500">Erro ao carregar líderes.</p>
                ) : leadersQuery.data && leadersQuery.data.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border">
                      <thead>
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Nome</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Telefone</th>
                          <th scope="col" className="relative px-6 py-3">
                            <span className="sr-only">Ações</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-card divide-y divide-border">
                        {leadersQuery.data.map((leader) => (
                          <tr key={leader.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-card-foreground">{leader.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{leader.email}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{leader.phone || '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                              <div className="flex space-x-2">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm" data-testid={`button-edit-leader-${leader.id}`}>
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Editar Líder</DialogTitle>
                                    </DialogHeader>
                                    <LeaderForm
                                      initialData={leader}
                                      onSuccess={() => {
                                        leadersQuery.refetch();
                                      }}
                                    />
                                  </DialogContent>
                                </Dialog>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleDeleteLeader(leader.id, leader.name)}
                                  data-testid={`button-delete-leader-${leader.id}`}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      Nenhum líder encontrado
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Adicione o primeiro líder para começar a gerir sua equipe.
                    </p>
                    <Dialog open={showLeaderForm} onOpenChange={setShowLeaderForm}>
                      <DialogTrigger asChild>
                        <Button data-testid="button-add-leader-empty">
                          <UserPlus className="w-4 h-4 mr-2" />
                          Adicionar Primeiro Líder
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Cadastrar Novo Líder</DialogTitle>
                        </DialogHeader>
                        <LeaderForm
                          onSuccess={() => setShowLeaderForm(false)}
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-destructive/10 rounded-full">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <AlertDialogTitle className="text-lg font-semibold">
                  Confirmar Eliminação
                </AlertDialogTitle>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogDescription className="text-base py-4">
            Tem certeza que deseja eliminar o líder{" "}
            <span className="font-semibold text-foreground">
              "{leaderToDelete?.name}"
            </span>
            ?
            <br />
            <br />
            <span className="text-sm text-muted-foreground">
              Esta ação não pode ser desfeita. O líder perderá o acesso ao sistema
              e todos os dados associados serão removidos permanentemente.
            </span>
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setDeleteConfirmOpen(false);
                setLeaderToDelete(null);
              }}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteLeader}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteLeaderMutation.isPending}
            >
              {deleteLeaderMutation.isPending ? "A eliminar..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}