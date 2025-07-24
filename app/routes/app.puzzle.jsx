import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import PuzzleGame from "../components/PuzzleGame";
import puzzleStyles from "../components/puzzle.css?url";

export const links = () => [
  { rel: "stylesheet", href: puzzleStyles },
];

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  
  const url = new URL(request.url);
  const productId = url.searchParams.get("product_id");
  
  console.log("Puzzle page - Product ID:", productId);
  
  // Get sample product data - you can modify this to get real product data
  const productData = {
    id: productId ? parseInt(productId) : 1234567890,
    title: `Puzzle Product ${productId || 'Sample'}`,
    images: {
      featured: "https://via.placeholder.com/800x600/4CAF50/white?text=Puzzle+Image+" + (productId || 'Sample'),
      preview: "https://via.placeholder.com/400x300/4CAF50/white?text=Preview+" + (productId || 'Sample')
    }
  };

  // Mock customer data - replace with actual Shopify customer data
  const customerData = {
    id: 123456,
    first_name: "Test User"
  };

  return json({
    product: productData,
    customer: customerData,
    puzzleSrc: productData.images.featured,
    puzzlePreview: productData.images.preview,
    productId: productId
  });
};

export default function PuzzlePage() {
  const { product, customer, puzzleSrc, puzzlePreview, productId } = useLoaderData();

  return (
    <div style={{ padding: "20px", textAlign: "center" }}>
      <h1>Puzzle Game - {product.title}</h1>
      <p>Kliknij przycisk poniżej, aby rozpocząć grę w puzzle!</p>
      
      <div style={{ 
        backgroundColor: "#f0f0f0", 
        padding: "10px", 
        margin: "10px 0",
        borderRadius: "5px",
        fontSize: "14px"
      }}>
        <strong>Debug Info:</strong><br/>
        Product ID: {productId}<br/>
        Product Title: {product.title}<br/>
        Customer: {customer.first_name} (ID: {customer.id})
      </div>
      
      <PuzzleGame
        productId={product.id}
        customerData={customer}
        puzzleSrc={puzzleSrc}
        puzzlePreview={puzzlePreview}
        baseImg={product.images.featured}
      />
      
      <div style={{ marginTop: "40px", maxWidth: "600px", margin: "40px auto" }}>
        <h2>Jak grać:</h2>
        <ol style={{ textAlign: "left" }}>
          <li>Wybierz poziom trudności (30, 56, 99, 143, lub 304 elementy)</li>
          <li>Kliknij "Rozpocznij grę"</li>
          <li>Przeciągaj elementy puzzle, aby je połączyć</li>
          <li>Użyj przycisku "Podgląd", aby zobaczyć kompletny obrazek</li>
          <li>Ułóż wszystkie elementy, aby ukończyć puzzle!</li>
        </ol>
      </div>
    </div>
  );
}