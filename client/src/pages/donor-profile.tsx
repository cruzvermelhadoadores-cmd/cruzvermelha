import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  User, 
  Phone, 
  MapPin, 
  Heart, 
  Calendar, 
  Edit, 
  Trash2, 
  Plus,
  AlertCircle,
  Info
} from "lucide-react";
import Header from "@/components/header";
import DonorForm from "@/components/donor-form";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertDonationSchema, type InsertDonation, type Donor, type Donation } from "@shared/schema";

export default function DonorProfile() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [showEditForm, setShowEditForm] = useState(false);
  const [showAddDonation, setShowAddDonation] = useState(false);
  const { data: authData } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const user = authData?.user;
  const isAdmin = user?.role === "admin";
  
  const { data: donor, isLoading } = useQuery<Donor>({
    queryKey: ["/api/donors", id],
  });
  
  const { data: donations } = useQuery<Donation[]>({
    queryKey: ["/api/donations/donor", id],
  });
  
  const addDonationForm = useForm<InsertDonation>({
    resolver: zodResolver(insertDonationSchema),
    defaultValues: {
      donorId: id,
      donationDate: new Date().toISOString().split('T')[0],
      donationTime: new Date().toTimeString().slice(0, 5),
      notes: "",
    },
  });
  
  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/donors/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Doador eliminado com sucesso",
      });
      setLocation("/donors/search");
    },
  });
  
  const addDonationMutation = useMutation({
    mutationFn: async (data: InsertDonation) => {
      const response = await apiRequest("POST", "/api/donations", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/donations/donor", id] });
      toast({
        title: "Sucesso",
        description: "Doação registrada com sucesso",
      });
      setShowAddDonation(false);
      addDonationForm.reset();
    },
  });
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!donor) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Doador não encontrado</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }
  
  const getInitials = (name: string | undefined | null) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map(word => word[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };
  
  const onAddDonation = async (data: InsertDonation) => {
    await addDonationMutation.mutateAsync(data);
  };
  
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Perfil do Doador
            </h2>
            <p className="text-muted-foreground">
              Informações detalhadas e histórico de doações
            </p>
          </div>
        </div>
        <div className="mb-4 flex items-center justify-end">
          {isAdmin && (
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowEditForm(true)}
                data-testid="button-edit-donor"
              >
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                data-testid="button-delete-donor"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar
              </Button>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center">
                    <span className="text-lg font-semibold text-primary">
                      {getInitials(donor.fullName)}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{donor.fullName}</h3>
                    <p className="text-muted-foreground">BI: {donor.biNumber}</p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Idade</p>
                    <p className="font-medium">{donor.age} anos</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Sexo</p>
                    <p className="font-medium">{donor.gender === "M" ? "Masculino" : "Feminino"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tipo Sanguíneo</p>
                    <Badge variant="secondary" className="mt-1">
                      {donor.bloodType}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge 
                      variant={donor.isAptToDonate ? "default" : "destructive"}
                      className="mt-1"
                    >
                      {donor.isAptToDonate ? "Apto" : "Não Apto"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Contact Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-4">
                   Informações de Contacto
                </CardTitle> 
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-3">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span>{donor.municipality}{donor.neighborhood && `, ${donor.neighborhood}`}</span>
                </div>
                {donor.contact && (
                  <div className="flex items-center space-x-3">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{donor.contact}</span>
                  </div>
                )}
                {donor.position && (
                  <div className="flex items-center space-x-3">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span>{donor.position}</span>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Medical Info */}
            <Card>
              <CardHeader>
                <CardTitle>Informação Médica</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Doações Anteriores</p>
                    <p className="font-medium">{donor.previousDonations}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Última Doação</p>
                    <p className="font-medium">
                      {donor.lastDonation ? new Date(donor.lastDonation).toLocaleDateString() : "N/A"}
                    </p>
                  </div>
                </div>
                {donor.medicalRestrictions && (
                  <div>
                    <p className="text-sm text-muted-foreground">Restrições Médicas</p>
                    <p className="text-sm">{donor.medicalRestrictions}</p>
                  </div>
                )}
                {donor.observations && (
                  <div>
                    <p className="text-sm text-muted-foreground">Observações</p>
                    <p className="text-sm">{donor.observations}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Donations History */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    Histórico de Doações
                  </CardTitle>
                  <Dialog open={showAddDonation} onOpenChange={setShowAddDonation}>
                    <DialogTrigger asChild>
                      <Button size="sm" data-testid="button-add-donation">
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Adicionar Nova Doação</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={addDonationForm.handleSubmit(onAddDonation)} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="donationDate">Data da Doação</Label>
                          <Input
                            id="donationDate"
                            type="date"
                            {...addDonationForm.register("donationDate")}
                            data-testid="input-donation-date"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="donationTime">Hora da Doação</Label>
                          <Input
                            id="donationTime"
                            type="time"
                            {...addDonationForm.register("donationTime")}
                            data-testid="input-donation-time"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="notes">Notas</Label>
                          <Textarea
                            id="notes"
                            {...addDonationForm.register("notes")}
                            placeholder="Observações sobre a doação"
                            data-testid="textarea-donation-notes"
                          />
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowAddDonation(false)}
                          >
                            Cancelar
                          </Button>
                          <Button
                            type="submit"
                            disabled={addDonationMutation.isPending}
                            data-testid="button-submit-donation"
                          >
                            {addDonationMutation.isPending ? "A registrar..." : "Registrar"}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {donations && donations.length > 0 ? (
                    donations.map((donation, index) => (
                      <div 
                        key={donation.id} 
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        data-testid={`donation-history-${index}`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-black/10 rounded-full flex items-center justify-center">
                            <Heart className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {new Date(donation.donationDate).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                             {donation.donationTime}
                            </p>
                          </div>
                        </div>
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <Heart className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Nenhuma doação registrada</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Edit Dialog */}
        <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Doador</DialogTitle>
            </DialogHeader>
            <DonorForm
              initialData={donor as any}
              donorId={donor.id}
              onSuccess={() => {
                setShowEditForm(false);
                queryClient.invalidateQueries({ queryKey: ["/api/donors", id] });
              }}
            />
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
