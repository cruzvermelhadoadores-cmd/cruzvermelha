
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, UserPlus, Trash2, Edit } from "lucide-react";
import Header from "@/components/header";
import LeaderForm from "@/components/leader-form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  role: string;
  provinceId: string;
  isProvisional: boolean;
  createdAt: string;
}

interface Province {
  id: string;
  name: string;
}

export default function UserManagement() {
  const [showLeaderForm, setShowLeaderForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["/api/leaders"],
  });

  const { data: provinces = [] } = useQuery({
    queryKey: ["/api/provinces"],
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("DELETE", `/api/leaders/${userId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leaders"] });
      toast({
        title: "Sucesso",
        description: "Utilizador eliminado com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao eliminar utilizador",
        variant: "destructive",
      });
    },
  });

  const getProvinceName = (provinceId: string) => {
    const province = provinces.find((p: Province) => p.id === provinceId);
    return province?.name || "Província desconhecida";
  };

  const getRoleBadge = (role: string) => {
    const roleMap = {
      admin: { label: "Administrador", variant: "destructive" as const },
      leader: { label: "Líder", variant: "default" as const },
    };
    
    const roleInfo = roleMap[role as keyof typeof roleMap] || { label: role, variant: "secondary" as const };
    
    return (
      <Badge variant={roleInfo.variant}>
        {roleInfo.label}
      </Badge>
    );
  };

  const handleDeleteUser = async (userId: string) => {
    await deleteUserMutation.mutateAsync(userId);
  };

  if (usersLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
    
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Gestão de Utilizadores
          </h2>
          <p className="text-muted-foreground">
            Gerencie administradores e líderes do sistema
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <CardTitle>Utilizadores</CardTitle>
              </div>
              <Dialog open={showLeaderForm} onOpenChange={setShowLeaderForm}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-user">
                    <UserPlus className="w-4 h-4" />
                    <h1 className="hidden sm:block">
                    Adicionar Utilizador
                    </h1>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Cadastrar Novo Utilizador</DialogTitle>
                  </DialogHeader>
                  <LeaderForm
                    onSuccess={() => setShowLeaderForm(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Nenhum utilizador encontrado
                </h3>
                <p className="text-muted-foreground">
                  Comece adicionando o primeiro utilizador ao sistema.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Província</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user: User) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>{getProvinceName(user.provinceId)}</TableCell>
                      <TableCell>
                        <Badge variant={user.isProvisional ? "outline" : "default"}>
                          {user.isProvisional ? "Provisório" : "Ativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Dialog open={editingUser?.id === user.id} onOpenChange={(open) => setEditingUser(open ? user : null)}>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Edit className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Editar Utilizador</DialogTitle>
                              </DialogHeader>
                              <LeaderForm
                                initialData={editingUser}
                                userId={editingUser?.id}
                                onSuccess={() => setEditingUser(null)}
                              />
                            </DialogContent>
                          </Dialog>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Eliminar Utilizador</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja eliminar o utilizador "{user.name}"? 
                                  Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
