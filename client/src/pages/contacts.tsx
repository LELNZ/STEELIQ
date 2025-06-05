import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Building2, 
  Users, 
  UserCheck, 
  Truck, 
  Search, 
  Plus,
  Phone,
  Mail,
  MapPin,
  Star,
  Edit,
  Trash2
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { Supplier } from "@shared/schema";

export default function ContactsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("suppliers");

  // Fetch suppliers data
  const { data: suppliers = [], isLoading } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const filteredSuppliers = suppliers.filter(supplier => 
    supplier.type === selectedType &&
    (supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     supplier.company.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getContactTypeIcon = (type: string) => {
    switch(type) {
      case "suppliers": return <Building2 className="w-5 h-5" />;
      case "vendors": return <Truck className="w-5 h-5" />;
      case "clients": return <Users className="w-5 h-5" />;
      case "users": return <UserCheck className="w-5 h-5" />;
      default: return <Building2 className="w-5 h-5" />;
    }
  };

  const getContactTypeName = (type: string) => {
    switch(type) {
      case "suppliers": return "Suppliers";
      case "vendors": return "Vendors";
      case "clients": return "Clients";
      case "users": return "System Users";
      default: return "Suppliers";
    }
  };

  const getContactTypeDescription = (type: string) => {
    switch(type) {
      case "suppliers": return "Material suppliers and steel distributors";
      case "vendors": return "Service vendors and contractors";
      case "clients": return "Customer contacts and project managers";
      case "users": return "Internal system users and staff";
      default: return "Material suppliers and steel distributors";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Contacts</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage suppliers, vendors, clients, and system users
          </p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Contact
        </Button>
      </div>

      <Tabs value={selectedType} onValueChange={setSelectedType} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="suppliers" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Suppliers
          </TabsTrigger>
          <TabsTrigger value="vendors" className="flex items-center gap-2">
            <Truck className="w-4 h-4" />
            Vendors
          </TabsTrigger>
          <TabsTrigger value="clients" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Clients
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <UserCheck className="w-4 h-4" />
            Users
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <div className="flex items-center space-x-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder={`Search ${getContactTypeName(selectedType).toLowerCase()}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <TabsContent value={selectedType} className="mt-0">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  {getContactTypeIcon(selectedType)}
                  <div>
                    <CardTitle className="text-xl">{getContactTypeName(selectedType)}</CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {getContactTypeDescription(selectedType)}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">Loading contacts...</p>
                  </div>
                ) : filteredSuppliers.length === 0 ? (
                  <div className="text-center py-12">
                    {getContactTypeIcon(selectedType)}
                    <p className="text-gray-600 dark:text-gray-400 mt-4">
                      {searchTerm ? 
                        `No ${getContactTypeName(selectedType).toLowerCase()} found matching "${searchTerm}"` :
                        `No ${getContactTypeName(selectedType).toLowerCase()} added yet`
                      }
                    </p>
                    <Button className="mt-4 bg-blue-600 hover:bg-blue-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Add First {selectedType === "suppliers" ? "Supplier" : selectedType === "vendors" ? "Vendor" : selectedType === "clients" ? "Client" : "User"}
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {filteredSuppliers.map((contact) => (
                      <Card key={contact.id} className="border-l-4 border-l-blue-500">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                                  {contact.name}
                                </h3>
                                <Badge variant="secondary" className="text-xs">
                                  {contact.company}
                                </Badge>
                                {contact.qualityRating && contact.qualityRating >= 4 && (
                                  <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                                    <Star className="w-3 h-3 mr-1 fill-current" />
                                    {contact.qualityRating}/5
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                {contact.email && (
                                  <div className="flex items-center text-gray-600 dark:text-gray-400">
                                    <Mail className="w-4 h-4 mr-2 text-blue-500" />
                                    {contact.email}
                                  </div>
                                )}
                                {contact.phone && (
                                  <div className="flex items-center text-gray-600 dark:text-gray-400">
                                    <Phone className="w-4 h-4 mr-2 text-green-500" />
                                    {contact.phone}
                                  </div>
                                )}
                                {contact.city && (
                                  <div className="flex items-center text-gray-600 dark:text-gray-400">
                                    <MapPin className="w-4 h-4 mr-2 text-red-500" />
                                    {contact.city}, {contact.state}
                                  </div>
                                )}
                              </div>

                              {contact.paymentTerms && (
                                <div className="mt-3">
                                  <Badge variant="outline" className="text-xs">
                                    Payment: {contact.paymentTerms}
                                  </Badge>
                                </div>
                              )}
                            </div>

                            <div className="flex gap-2 ml-4">
                              <Button variant="ghost" size="sm">
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}