import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Plus, BarChart3, Heart } from "lucide-react";
import Header from "@/components/header";
import { useAuth } from "@/lib/auth";
import { DonorStats, RecentDonation } from "@shared/schema";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { data: authData } = useAuth();
  
  const { data: stats } = useQuery<DonorStats>({
    queryKey: ["/api/stats"],
  });
  
  const { data: recentDonations } = useQuery<RecentDonation[]>({
    queryKey: ["/api/donations/recent"],
    meta: { queryParams: { limit: "5" } },
  });
  
  const user = authData?.user;
  const isAdmin = user?.role === "admin";
  
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Bem-vindo, {user?.name}
          </h2>
          <p className="text-muted-foreground">
            Gerencie doadores e doações de sangue de forma eficiente
          </p>
        </div>
        
        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Search Donors Card */}
          <Card 
            className="hover:shadow-md transition-shadow cursor-pointer" 
            onClick={() => setLocation("/donors/search")}
            data-testid="card-search-donors"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                {/* Ícone + título */}
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-red-500/10 rounded-lg">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-card-foreground">
                      Pesquisar Doadores
                    </h3>
                    <p className="text-sm text-muted-foreground hidden sm:block">
                      Gerencie doadores cadastrados
                    </p>
                  </div>
                </div>

                {/* Total de doadores */}
                <div className="text-2xl font-bold text-primary">
                  {stats?.totalDonors || 0}
                </div>
              </div>
            </CardContent>
          </Card>

          
          {/* Register Card */}
          <Card 
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setLocation("/donors/register")}
            data-testid="card-register-donor"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                {/* Ícone + título */}
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-accent rounded-lg">
                    <Plus className="w-6 h-6 text-accent-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-card-foreground">
                      Cadastrar
                    </h3>
                    <p className="text-sm text-muted-foreground hidden sm:block">
                      Adicione novos doadores
                    </p>
                  </div>
                </div>

                {/* Total (novos este mês) */}
                <div className="text-2xl font-bold text-accent-foreground">
                  +{stats?.newThisMonth || 0}
                </div>
              </div>
            </CardContent>
          </Card>

          
          {/* para Card (Admin pr) */}
          {isAdmin && (
            <Card 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setLocation("/reports")}
              data-testid="card-reports"
            >
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-black/10 rounded-lg">
                    <BarChart3 className="w-6 h-6 text-secondary-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-card-foreground">
                      Relatórios
                    </h3>
                    <p className="text-sm text-muted-foreground hidden sm:block">
                      Análises e estatísticas detalhadas
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* Recent Activity Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Donations */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-card-foreground">
                  Doações Recentes
                </h3>
                <button 
                  className="text-sm text-primary hover:text-primary/80"
                  onClick={() => setLocation("/donors/search")}
                  data-testid="button-view-all-donations"
                >
                  Ver todas
                </button>
              </div>
              
              <div className="space-y-4">
                {recentDonations && recentDonations.length > 0 ? (
                  recentDonations.map((donation, index) => (
                    <div 
                      key={donation.id} 
                      className="flex items-center space-x-4 p-3 bg-muted/50 rounded-lg"
                      data-testid={`donation-recent-${index}`}
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
                          {new Date(donation.donationDate).toLocaleDateString()}
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
                    <p>Nenhuma doação recente registrada</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Blood Type Statistics */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-card-foreground mb-4">
                Estatísticas por Tipo Sanguíneo
              </h3>
              
              <div className="space-y-4">
                {stats?.bloodTypeStats && Object.entries(stats.bloodTypeStats).map(([type, data]) => (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-4 h-4 bg-primary rounded-full"></div>
                      <span className="font-medium text-card-foreground">
                        Tipo {type}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-card-foreground">
                        {data.count}
                      </span>
                      <div className="w-24 bg-muted rounded-full h-2 mt-1">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${data.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
