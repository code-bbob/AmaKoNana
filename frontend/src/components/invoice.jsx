import { useState, useEffect } from "react"
import { format } from "date-fns"
import styled from "styled-components"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Printer } from "lucide-react"
import useAxios from "@/utils/useAxios"

// Styled components
const InvoiceContainer = styled.div`
  max-width: 3xl;
  margin: 0 auto;
  padding: 2rem;
  background-color: white;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);

  @media print {
    box-shadow: none;
    padding: 0;
  }
`

const InvoiceHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
`

const CompanyInfo = styled.div`
  h1 {
    font-size: 1.875rem;
    font-weight: bold;
    color: #1f2937;
  }

  p {
    font-size: 0.875rem;
    color: #4b5563;
  }
`

const InvoiceInfo = styled.div`
  text-align: right;

  h2 {
    font-size: 1.5rem;
    font-weight: 600;
    color: #1f2937;
  }

  p {
    font-size: 0.875rem;
    color: #4b5563;
  }
`

const BillTo = styled.div`
  margin-bottom: 2rem;

  h3 {
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }

  p {
    color: #1f2937;
  }
`

const TotalAmount = styled.div`
  margin-top: 2rem;
  text-align: right;

  p {
    font-size: 1.125rem;
    font-weight: 600;
  }
`

const ThankYou = styled.div`
  margin-top: 3rem;
  text-align: center;
  font-size: 0.875rem;
  color: #4b5563;
`

const PrintButton = styled(Button)`
  margin-top: 2rem;
  width: 100%;

  @media print {
    display: none;
     @page {
    margin: 2cm;
  }
  }

`

// Main component
const Invoice = ({ transactionId }) => {
  const [invoiceData, setInvoiceData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const api = useAxios()

  useEffect(() => {
    const fetchInvoiceData = async () => {
      try {
        const response = await api.get(`alltransaction/salestransaction/${transactionId}/`)
        setInvoiceData(response.data)
        setLoading(false)
      } catch (err) {
        setError("Failed to fetch invoice data")
        setLoading(false)
      }
    }

    fetchInvoiceData()
  }, [transactionId])

  const handlePrint = () => {
    window.print()
  }

  if (loading) return <div>Loading invoice...</div>
  if (error) return <div>{error}</div>
  if (!invoiceData) return null

  return (
    <InvoiceContainer>
      <InvoiceHeader>
        <CompanyInfo>
          <h1>Aama Ko Nana</h1>
          <p>Basundhara -03, Kathmandu</p>
          <p>Phone: (+977) 9851227175, 9841682921</p>
          {/* <p>Email: info@digitechenterprises.com</p> */}
        </CompanyInfo>
        <InvoiceInfo>
          <h2>Invoice</h2>
          <p>Invoice: {invoiceData.bill_no}</p>
          <p>Date: {format(new Date(invoiceData.date), "dd/MM/yyyy")}</p>
        </InvoiceInfo>
      </InvoiceHeader>

      <BillTo>
        <h3>Bill To:</h3>
        <p>{invoiceData.name}</p>
        <p>Phone: {invoiceData.phone_number}</p>
      </BillTo>

      <Table>
        <TableHeader>
          <TableRow>
          <TableHead>S.N</TableHead>
            <TableHead>Item</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
            <TableHead className="text-right">Unit Price</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoiceData.sales.map((item,index) => (
            
            <TableRow key={item.id}>
              <TableCell>{index+1}</TableCell>
              <TableCell>{item.product_name}</TableCell>
              <TableCell className="text-right">{item.quantity}</TableCell>
              <TableCell className="text-right">
                {item.unit_price}
              </TableCell>
              <TableCell className="text-right">
                {item.total_price}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <TotalAmount>
        <p>Total Amount: {invoiceData.total_amount}</p>
        {/* <p>Payment Method: {invoiceData.method}</p> */}
      </TotalAmount>

      <ThankYou>
        <p>Thank you for your business!</p>
      </ThankYou>

      <PrintButton onClick={handlePrint}>
        <Printer className="mr-2 h-4 w-4" />
        Print Invoice
      </PrintButton>
    </InvoiceContainer>
  )
}

export default Invoice

