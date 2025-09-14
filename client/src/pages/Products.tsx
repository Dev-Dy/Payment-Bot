import ProductCard from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function Products() {
  const [searchTerm, setSearchTerm] = useState("");
  
  // todo: remove mock functionality
  const mockProducts = [
    {
      id: "prod_1",
      name: "Premium Full-Stack Course",
      description: "Complete full-stack development course with React, Node.js, and database design. Includes 50+ hours of video content and practical projects.",
      price: "299.00",
      currency: "USD",
      imageUrl: undefined,
      active: true,
    },
    {
      id: "prod_2",
      name: "JavaScript E-book Bundle",
      description: "Collection of 5 comprehensive JavaScript books covering ES6+, async programming, testing, and performance optimization.",
      price: "49.99",
      currency: "USD",
      imageUrl: undefined,
      active: true,
    },
    {
      id: "prod_3",
      name: "React Video Series",
      description: "15-part video series covering React hooks, context, testing, and advanced patterns. Perfect for intermediate developers.",
      price: "79.99",
      currency: "USD", 
      imageUrl: undefined,
      active: false,
    },
    {
      id: "prod_4",
      name: "One-on-One Mentorship",
      description: "Personal 1-hour mentorship session with an experienced developer. Get code reviews and career advice.",
      price: "150.00",
      currency: "USD",
      imageUrl: undefined,
      active: true,
    }
  ];

  const filteredProducts = mockProducts.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (id: string) => console.log('Edit product:', id);
  const handleToggleStatus = (id: string) => console.log('Toggle status:', id);
  const handleDelete = (id: string) => console.log('Delete product:', id);
  const handleAddProduct = () => console.log('Add new product');

  return (
    <div className="space-y-6" data-testid="page-products">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">
            Manage your bot's product catalog
          </p>
        </div>
        <Button onClick={handleAddProduct} data-testid="button-add-product">
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
            data-testid="input-search-products"
          />
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-muted-foreground">
            {searchTerm ? "No products found matching your search." : "No products yet."}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map(product => (
            <ProductCard
              key={product.id}
              {...product}
              onEdit={handleEdit}
              onToggleStatus={handleToggleStatus}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}