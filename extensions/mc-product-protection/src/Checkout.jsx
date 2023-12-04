import React, { useEffect, useState } from "react";
import {
  reactExtension,
  //Components
  Divider,
  Banner,
  InlineSpacer,
  InlineStack,
  BlockStack,
  BlockSpacer,
  Text,
  useCartLines,
  Checkbox,
  useApplyCartLinesChange,
  useApi,
  useSettings,
  useSubtotalAmount,
  useTotalAmount
} from "@shopify/ui-extensions-react/checkout";
// Set up the entry point for the extension
export default reactExtension("purchase.checkout.block.render", () => <App />);

function App() {
  const settings = useSettings();
  const ProtectionTitle = settings.title ? settings.title: "Package Protection"; 
  const ProtectionDescription = settings.description ? settings.description: "Against loss, theft, or damage in transit and instant resolution.";
  const ProtectionProductHandle = settings.protection_product_handle ? settings.protection_product_handle : "product-protection";
  const { query, i18n } = useApi();
  const applyCartLinesChange = useApplyCartLinesChange();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [showError, setShowError] = useState(false);
  const lines = useCartLines();
  const subTotalAmount = useSubtotalAmount();
  const totalAmount = useTotalAmount();
  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (showError) {
      const timer = setTimeout(() => setShowError(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showError]);

    async function handleAddToCart(variantId) {
      setAdding(true);
      const result = await applyCartLinesChange({
        type: 'addCartLine',
        merchandiseId: variantId,
        quantity: 1,
      });
      setAdding(false);
      if (result.type === 'error') {
        setShowError(true);
        console.error(result.message);
      }
    }

  async function fetchProducts() {
    setLoading(true);
    try {
      const { data } = await query(
        `query ($handle: String!, $first: Int!) {
          productByHandle(handle: $handle) {
            id
            variants(first: $first) {
              nodes {
                id
                title
              }
            }
          }
        }`,
        {
          variables: { handle: ProtectionProductHandle, first: 100 },
        }
      );
      console.log(data.productByHandle);
      setProducts(data.products.nodes);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <LoadingSkeleton 
      ProtectionTitle = {ProtectionTitle}
      ProtectionDescription = {ProtectionDescription}
    />;
  }

  if (!loading && products.length === 0) {
    return null;
  }

  const productsOnOffer = getProductsOnOffer(lines, products);

  if (!productsOnOffer.length) {
    return null;
  }

  return (
    <ProductOffer
      product={productsOnOffer[0]}
      i18n={i18n}
      adding={adding}
      handleAddToCart={handleAddToCart}
      showError={showError}
      ProtectionTitle={ProtectionTitle}
      ProtectionDescription={ProtectionDescription}
    />
  );
}

function LoadingSkeleton({ProtectionTitle, ProtectionDescription}) {
  return (
    <BlockStack spacing='none'>
      <Divider />
      <BlockSpacer spacing="base" />
      <Checkbox id="protectionSelector" name="applyProtection">{ ProtectionTitle }</Checkbox>
      <InlineStack>
        <InlineSpacer/>
        <Text size="base" appearance="info">{ProtectionDescription}</Text>
      </InlineStack>
      <BlockSpacer spacing="base" />
      <Divider />
    </BlockStack>
  );
}

function getProductsOnOffer(lines, products) {
  const cartLineProductVariantIds = lines.map((item) => item.merchandise.id);
  return products.filter((product) => {
    const isProductVariantInCart = product.variants.nodes.some(({ id }) =>
      cartLineProductVariantIds.includes(id)
    );
    return !isProductVariantInCart;
  });
}

function ProductOffer({ product, i18n, adding, handleAddToCart, showError, ProtectionTitle, ProtectionDescription }) {
  const { images, title, variants } = product;
  const renderPrice = i18n.formatCurrency(variants.nodes[0].price.amount);
  const imageUrl =
    images.nodes[0]?.url ??
    'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_medium.png?format=webp&v=1530129081';

  return (
    <BlockStack spacing='none'>
      <Divider />
      <BlockSpacer spacing="base" />
      <Checkbox id="protectionSelector" name="applyProtection">{ ProtectionTitle } - $1.35</Checkbox>
      <InlineStack>
        <InlineSpacer/>
        <Text size="base" appearance="info">{ProtectionDescription}</Text>
      </InlineStack>
      {showError && <ErrorBanner />}
      <BlockSpacer spacing="base" />
      <Divider />
    </BlockStack>
  );
}

function ErrorBanner() {
  return (
    <Banner status='critical'>
      There was an issue adding this product. Please try again.
    </Banner>
  );
}
