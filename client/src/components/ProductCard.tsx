import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, MoreVertical, Package } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface ProductCardProps {
  id: string;
  name: string;
  description: string;
  price: string;
  currency: string;
  imageUrl?: string;
  active: boolean;
  onEdit?: (id: string) => void;
  onToggleStatus?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export default function ProductCard({
  id,
  name,
  description,
  price,
  currency,
  imageUrl,
  active,
  onEdit,
  onToggleStatus,
  onDelete
}: ProductCardProps) {
  return (
    <Card className="hover-elevate" data-testid={`card-product-${id}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <Badge variant={active ? "default" : "secondary"}>
            {active ? "Active" : "Inactive"}
          </Badge>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" data-testid={`button-menu-${id}`}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit?.(id)} data-testid={`button-edit-${id}`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onToggleStatus?.(id)}>
              {active ? "Deactivate" : "Activate"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete?.(id)} className="text-destructive">
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={name}
            className="w-full h-32 object-cover rounded-md mb-3"
            data-testid={`img-product-${id}`}
          />
        ) : (
          <div className="w-full h-32 bg-muted rounded-md flex items-center justify-center mb-3">
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        <h3 className="font-semibold text-lg mb-2" data-testid={`text-name-${id}`}>{name}</h3>
        <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{description}</p>
      </CardContent>
      <CardFooter className="flex justify-between items-center">
        <div className="font-mono text-lg font-bold" data-testid={`text-price-${id}`}>
          {currency} {price}
        </div>
        <Button variant="outline" size="sm" onClick={() => onEdit?.(id)} data-testid={`button-quick-edit-${id}`}>
          <Edit className="h-3 w-3 mr-1" />
          Edit
        </Button>
      </CardFooter>
    </Card>
  );
}