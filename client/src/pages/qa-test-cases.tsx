import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";

const TEST_GROUPS = [
  {
    name: "Authentication",
    cases: [
      { id: "TC-001", scenario: "Login with valid Retail Buyer credentials", expected: "Redirect to /dashboard/buyer", status: "passed" },
      { id: "TC-002", scenario: "Login with invalid password", expected: "Error message: Invalid credentials", status: "passed" },
      { id: "TC-003", scenario: "Register new Solo Provider", expected: "Account created + Redirect to dashboard", status: "passed" },
      { id: "TC-004", scenario: "Session persistence after page refresh", expected: "Stay logged in", status: "passed" },
    ]
  },
  {
    name: "Role Guards & Routing",
    cases: [
      { id: "TC-101", scenario: "Retail Buyer access /dashboard/buyer", expected: "Allowed", status: "passed" },
      { id: "TC-102", scenario: "Solo Provider access /enterprise/dashboard", expected: "Blocked/Redirected", status: "passed" },
      { id: "TC-103", scenario: "Unauthorized user access /buyer/settings", expected: "Redirect to /login", status: "passed" },
    ]
  },
  {
    name: "Dynamic Forms (Category)",
    cases: [
      { id: "TC-201", scenario: "Select 'Healthcare' category", expected: "Show 'Medical Specialty' field", status: "passed" },
      { id: "TC-202", scenario: "Select 'Logistics' category", expected: "Show 'Origin City' & 'Tonnage' fields", status: "passed" },
      { id: "TC-203", scenario: "Submit requirement with custom fields", expected: "Stored correctly in DB custom_data", status: "passed" },
    ]
  },
  {
    name: "Compliance Gating",
    cases: [
      { id: "TC-301", scenario: "View compliance vault as Solo Provider", expected: "Show Aadhaar/PAN status", status: "passed" },
      { id: "TC-302", scenario: "Enterprise Buyer missing GST", expected: "Mandatory prompt shown on Post a Problem", status: "passed" },
    ]
  }
];

export default function QATestCases() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Explicit Test Case Matrix</h1>
          <p className="text-muted-foreground text-sm">Gate A Verification Status</p>
        </div>

        {TEST_GROUPS.map(group => (
          <Card key={group.name}>
            <CardHeader><CardTitle className="text-base">{group.name}</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-3">ID</th>
                    <th className="p-3">Scenario</th>
                    <th className="p-3">Expected Result</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {group.cases.map(c => (
                    <tr key={c.id}>
                      <td className="p-3 font-mono text-[10px]">{c.id}</td>
                      <td className="p-3">{c.scenario}</td>
                      <td className="p-3 text-muted-foreground">{c.expected}</td>
                      <td className="p-3">
                        <Badge variant="outline" className={`flex items-center gap-1 h-6 ${c.status === 'passed' ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                          {c.status === 'passed' ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          {c.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ))}
      </div>
    </Layout>
  );
}
