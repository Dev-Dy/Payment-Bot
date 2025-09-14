import ProductCard from '../ProductCard';

export default function ProductCardExample() {
  // todo: remove mock functionality
  const mockProducts = [
    {
      id: "1",
      name: "Premium Course",
      description: "Complete full-stack development course with hands-on projects and mentorship.",
      price: "299.00",
      currency: "USD",
      active: true,
    },
    {
      id: "2", 
      name: "E-book Bundle",
      description: "Collection of 5 programming books covering JavaScript, Python, and system design.",
      price: "49.99",
      currency: "USD", 
      active: false,
    }
  ];

  const handleEdit = (id: string) => console.log('Edit product:', id);
  const handleToggleStatus = (id: string) => console.log('Toggle status:', id);
  const handleDelete = (id: string) => console.log('Delete product:', id);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {mockProducts.map(product => (
        <ProductCard
          key={product.id}
          {...product}
          onEdit={handleEdit}
          onToggleStatus={handleToggleStatus}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}