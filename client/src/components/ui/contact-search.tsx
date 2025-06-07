import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { User, Phone, Mail, ChevronDown } from "lucide-react";

interface Contact {
  id: number;
  name: string;
  title?: string;
  position?: string;
  phoneMobile?: string;
  phonePrimary?: string;
  mobile?: string;
  workPhone?: string;
  email?: string;
  isPrimary?: boolean;
  isPrimaryContact?: boolean;
}

interface ContactSearchProps {
  entityType: "supplier" | "client";
  entityId?: number;
  value?: string;
  onChange: (contact: Contact | null) => void;
  placeholder?: string;
}

export function ContactSearch({ entityType, entityId, value, onChange, placeholder = "Search contacts..." }: ContactSearchProps) {
  const [searchTerm, setSearchTerm] = useState(value || "");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);

  // Fetch contacts for the entity
  const { data: contacts = [] } = useQuery({
    queryKey: [`/api/${entityType}s/${entityId}/contacts`],
    enabled: !!entityId
  });

  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = contacts.filter((contact: Contact) =>
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (contact.title || contact.position || "").toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredContacts(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setFilteredContacts(contacts);
      setShowSuggestions(false);
    }
  }, [searchTerm, contacts]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    if (newValue.trim() === "") {
      onChange(null);
    }
  };

  const handleContactSelect = (contact: Contact) => {
    setSearchTerm(contact.name);
    setShowSuggestions(false);
    onChange(contact);
  };

  const handleInputFocus = () => {
    if (contacts.length > 0) {
      setFilteredContacts(contacts);
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow for click events
    setTimeout(() => setShowSuggestions(false), 150);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Input
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          className="h-8 pr-8"
        />
        <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      </div>

      {showSuggestions && filteredContacts.length > 0 && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1 shadow-lg">
          <CardContent className="p-0 max-h-48 overflow-y-auto">
            {filteredContacts.map((contact) => (
              <Button
                key={contact.id}
                variant="ghost"
                className="w-full justify-start p-3 h-auto rounded-none border-b last:border-b-0"
                onClick={() => handleContactSelect(contact)}
              >
                <div className="flex items-start gap-3 w-full">
                  <User className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{contact.name}</span>
                      {(contact.isPrimary || contact.isPrimaryContact) && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                          Primary
                        </span>
                      )}
                    </div>
                    {(contact.title || contact.position) && (
                      <div className="text-sm text-muted-foreground">
                        {contact.title || contact.position}
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                      {(contact.phoneMobile || contact.mobile || contact.phonePrimary || contact.workPhone) && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {contact.phoneMobile || contact.mobile || contact.phonePrimary || contact.workPhone}
                        </div>
                      )}
                      {contact.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {contact.email}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      {searchTerm && filteredContacts.length === 0 && contacts.length > 0 && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1 shadow-lg">
          <CardContent className="p-3 text-sm text-muted-foreground text-center">
            No contacts found matching "{searchTerm}"
          </CardContent>
        </Card>
      )}
    </div>
  );
}