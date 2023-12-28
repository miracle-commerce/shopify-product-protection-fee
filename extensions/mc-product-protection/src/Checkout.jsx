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
import { Spinner } from "@shopify/ui-extensions/checkout";
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
  const [showError, setShowError] = useState(false);
  const lines = useCartLines();
  const subTotalAmount = useSubtotalAmount();
  const [removeOldProtection, setRemoveOldProtection] = useState(false);
  useEffect(() => {
    fetchProtectionProduct();
  }, []);

  useEffect(() => {
    if (showError) {
      const timer = setTimeout(() => setShowError(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showError]);

  useEffect(()=>{
    if(protectionProduct){
      const oldProtectionLines = lines.filter((line)=>{
        return line.merchandise.product.id == protectionProduct.id;
      })
      if(oldProtectionLines.length > 0){
        applyCartLinesChange({
          type: 'removeCartLine', 
          id: oldProtectionLines[0].id,
          quantity: oldProtectionLines[0].quantity
        }).then((result)=>{
          if(result.type === 'error'){
            console.error(result.message);
            setShowError(true);
          } else{
            setRemoveOldProtection(true);
          }
        })
      } else {
        setRemoveOldProtection(true);
      }
    }
  }, [protectionProduct])

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
    return false;
  }

  const protectionVariant = getprotectionVariant(subTotalAmount, protectionProduct);
  if(removeOldProtection){
    return (
      <ProtectionOffer
        protectionProduct = {protectionProduct}
        variant={protectionVariant}
        lines = {lines}
        i18n={i18n}
        applyCartLinesChange={applyCartLinesChange}
        showError={showError}
        ProtectionTitle={ProtectionTitle}
        ProtectionDescription={ProtectionDescription}
      />
    );
  }
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
  console.log(subTotalAmount);
  let matchedProtectionVariant; 
  const subTotalPrice = subTotalAmount.amount;
  if(protectionProduct && protectionProduct.variants){
    protectionProduct.variants.nodes.forEach((variantNode)=>{
      const variantNodeTitle = variantNode.title.split("-"); 
      if(variantNodeTitle.length > 1){
        let minPrice = parseFloat(variantNodeTitle[0]); 
        let maxPrice = parseFloat(variantNodeTitle[1]); 
        if(minPrice <= subTotalPrice && maxPrice > subTotalPrice){
          matchedProtectionVariant = variantNode; 
        }
      } else {
        let minPrice = parseFloat(variantNodeTitle[0]);
        if(minPrice && minPrice <= subTotalPrice){
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

function ProtectionOffer({protectionProduct, variant, lines, i18n, applyCartLinesChange, showError, ProtectionTitle, ProtectionDescription }) {
  const { id, price} = variant;
  const renderPrice = i18n.formatCurrency(price.amount);
  const [protectionAdded, setProtectionAdded] = useState(true);
  const [processing, setProcessing] = useState(false);
  function handleProtection(e){
    setProcessing(true);
    if(e){
      applyCartLinesChange({
        type: 'addCartLine',
        merchandiseId: variant.id,
        quantity: 1,
      }).then((result)=>{
        if (result.type === 'error') {
          console.error(result.message);
        }else{
          setProtectionAdded(true);
          setProcessing(false);
        }
      });
  
    } else {
      const protectionLines = lines.filter((line)=>{
        return line.merchandise.product.id == protectionProduct.id;
      })
      if(protectionLines.length > 0){
        applyCartLinesChange({
          type: 'removeCartLine', 
          id: protectionLines[0].id,
          quantity: protectionLines[0].quantity
        }).then((result)=>{
          if(result.type === 'error'){
            console.error(result.message);
          }
          setProtectionAdded(false);
          setProcessing(false);
        })
      }
    }
  }

  useEffect(()=>{
    if(protectionAdded){
      handleProtection(true);
    }
  }, [])

  return (
    <BlockStack spacing='none'>
      <Divider />
      <BlockSpacer spacing="base" />
      {!processing? <Checkbox id="protectionSelector" name="applyProtection" value={protectionAdded} onChange={e=>handleProtection(e)}>{ ProtectionTitle } - {renderPrice}</Checkbox>:<InlineStack><Spinner/>{ ProtectionTitle } - {renderPrice}</InlineStack>}
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
