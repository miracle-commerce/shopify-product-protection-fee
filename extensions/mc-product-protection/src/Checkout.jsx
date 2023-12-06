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
  const [protectionProduct, setProtectionProduct] = useState(false);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [showError, setShowError] = useState(false);
  const lines = useCartLines();
  const subTotalAmount = useSubtotalAmount();
  const totalAmount = useTotalAmount();
  useEffect(() => {
    fetchProtectionProduct();
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

  async function fetchProtectionProduct() {
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
                price {
                  amount
                  currencyCode
                }
              }
            }
          }
        }`,
        {
          variables: { handle: ProtectionProductHandle, first: 100 },
        }
      );
      setProtectionProduct(data.productByHandle);
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

  if (!loading && !protectionProduct) {
    return null;
  }

  if(protectionProduct){
    console.log(protectionProduct);
  }

  const protectionVariant = getprotectionVariant(lines, subTotalAmount, protectionProduct);
  if (!protectionVariant) {
    return null;
  }

  return (
    <ProtectionOffer
      variant={protectionVariant}
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

function getprotectionVariant(subTotalAmount, protectionProduct) {
  let matchedProtectionVariant; 
  if(protectionProduct && protectionProduct.variants){
    protectionProduct.variants.nodes.forEach((variantNode)=>{
      const variantNodeTitle = variantNode.title.split("-"); 
      if(variantNodeTitle.length > 1){
        let minPrice = parseFloat(variantNodeTitle[0]); 
        let maxPrice = parseFloat(variantNodeTitle[1]); 
        if(minPrice && maxPrice && minPrice <= subTotalAmount.amount && maxPrice > subTotalAmount.amount){
          matchedProtectionVariant = variantNode; 
        }
      } else {
        let minPrice = parseFloat(variantNodeTitle[0]);
        if(minPrice && minPrice <= subTotalAmount.amount){
          matchedProtectionVariant = variantNode; 
        }
      }
    })

    if(matchedProtectionVariant){
      return matchedProtectionVariant;
    } else {
      return false;
    }
  }else{
    return false;
  }
}

function ProtectionOffer({ variant, i18n, adding, handleAddToCart, showError, ProtectionTitle, ProtectionDescription }) {
  const { id, price} = variant;
  const renderPrice = i18n.formatCurrency(price.amount);

  return (
    <BlockStack spacing='none'>
      <Divider />
      <BlockSpacer spacing="base" />
      <Checkbox id="protectionSelector" name="applyProtection">{ ProtectionTitle } - {renderPrice}</Checkbox>
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
