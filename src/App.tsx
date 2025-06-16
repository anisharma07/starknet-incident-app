import { useState, useEffect } from "react";
import { useConnect, useDisconnect, useAccount } from "@starknet-react/core";
import {
  Shield,
  Zap,
  AlertTriangle,
  Search,
  User,
  Clock,
  Hash,
  FileText,
  Wallet,
  Activity,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Coins,
} from "lucide-react";
import {
  useReportIncident,
  useApproveMedTokens,
} from "./hooks/useWriteContract";
import { useGetIncident, useGetUserMedBalance } from "./hooks/useReadContract";

interface ReportedIncident {
  id: string;
  timestamp: string;
  reportedBy: string;
  description: string;
}

interface FetchedIncident {
  id: string;
  description: string;
  reporter: string;
  timestamp: string;
}

function App() {
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { address } = useAccount();

  const [description, setDescription] = useState("");
  const [incidentId, setIncidentId] = useState("");
  const [fetchedIncident, setFetchedIncident] =
    useState<FetchedIncident | null>(null);
  const [reportedIncident, setReportedIncident] =
    useState<ReportedIncident | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [activeTab, setActiveTab] = useState<"report" | "search">("report");
  const [showWalletModal, setShowWalletModal] = useState(false);

  // Animation states
  const [showSuccess, setShowSuccess] = useState(false);

  // Helper function to format address
  const formatAddress = (addr: string): string => {
    if (!addr) return "";

    // Ensure address starts with 0x
    const address = addr.startsWith("0x") ? addr : `0x${addr}`;

    // If address is too short, return as is
    if (address.length < 10) return address;

    // Format as 0x12345...67890
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Hooks for contract interactions
  const {
    reportIncident,
    isPending: isReportPending,
    error: reportError,
  } = useReportIncident();
  const {
    approveMedTokens,
    isPending: isApprovePending,
    error: approveError,
  } = useApproveMedTokens();
  const {
    incident,
    refetchIncident,
    isLoading: isFetchingIncident,
  } = useGetIncident({
    incidentId: incidentId.trim() || undefined,
  });
  const {
    balance: medBalance,
    isLoading: isBalanceLoading,
    hasBalance,
  } = useGetUserMedBalance();

  useEffect(() => {
    if (reportedIncident) {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [reportedIncident]);

  // Update fetchedIncident when incident data changes
  useEffect(() => {
    if (incident && incidentId.trim()) {
      setFetchedIncident({
        ...incident,
        timestamp: new Date(incident.timestamp * 1000).toLocaleString(),
      });
    }
  }, [incident, incidentId]);

  // Connect Wallet
  const connectWallet = () => {
    if (connectors.length === 0) {
      alert(
        "No wallet connectors available. Please install ArgentX or Braavos wallet."
      );
      return;
    }
    setShowWalletModal(true);
  };

  // Connect to specific wallet
  const connectToWallet = async (connector: (typeof connectors)[0]) => {
    setIsConnecting(true);
    setShowWalletModal(false);
    try {
      await connect({ connector });
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      alert("Failed to connect wallet. Please try again.");
    } finally {
      setIsConnecting(false);
    }
  };

  // Report Incident
  const handleReportIncident = async (): Promise<void> => {
    if (!address) {
      alert("Please connect your wallet first");
      return;
    }

    if (!description.trim()) {
      alert("Please enter an incident description");
      return;
    }

    try {
      console.log("Reporting incident...");

      // Report the incident directly
      const result = await reportIncident(description.trim());
      if (result) {
        setReportedIncident({
          id: Date.now().toString(), // Temporary ID, should be from contract
          timestamp: new Date().toLocaleString(),
          reportedBy: address,
          description: description.trim(),
        });
        setDescription("");
      }
    } catch (error) {
      console.error("Failed to report incident:", error);
      if (error instanceof Error && error.message.includes("allowance")) {
        alert(
          "Please approve MED tokens first using the 'Approve MED Tokens' button, then try reporting the incident again."
        );
      } else {
        alert("Failed to report incident. Please try again.");
      }
    }
  };

  // Get Incident by ID
  const handleFetchIncident = async () => {
    if (!incidentId.trim()) {
      alert("Please enter an incident ID");
      return;
    }

    try {
      await refetchIncident();
    } catch (error) {
      console.error("Failed to fetch incident:", error);
      alert("Failed to fetch incident. Please check the ID and try again.");
    }
  };

  // Loading state combines both report and fetch loading states
  const isLoading = isReportPending || isFetchingIncident || isApprovePending;

  // Show errors if any
  useEffect(() => {
    if (reportError) {
      console.error("Report error:", reportError);
    }
    if (approveError) {
      console.error("Approve error:", approveError);
    }
  }, [reportError, approveError]);

  ////

  //frontend

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Floating Orbs */}
      <div className="absolute top-20 left-20 w-32 h-32 bg-purple-500/20 rounded-full blur-xl animate-bounce"></div>
      <div className="absolute bottom-20 right-20 w-48 h-48 bg-blue-500/20 rounded-full blur-xl animate-pulse"></div>
      <div className="absolute top-1/2 right-1/4 w-24 h-24 bg-pink-500/20 rounded-full blur-xl animate-bounce delay-1000"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Top Bar with Balance */}
        {address && (
          <div className="flex justify-end mb-6">
            <div className="flex items-center gap-3 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
              <Coins className="w-5 h-5 text-yellow-400" />
              <div className="text-sm">
                <span className="text-gray-300">MED Balance:</span>
                <span
                  className={`ml-2 font-semibold ${
                    hasBalance ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {isBalanceLoading ? "..." : `${medBalance} MED`}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Hero Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full blur-lg opacity-75 animate-pulse"></div>
              <Shield className="relative text-white w-16 h-16 p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-black bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent mb-4">
            SecureReport
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Decentralized incident reporting system powered by blockchain
            technology. Report, track, and verify incidents with complete
            transparency.
          </p>

          {/* Wallet Connection */}
          <div className="flex justify-center mb-8">
            {!address ? (
              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className="group relative px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full text-white font-semibold text-lg shadow-lg hover:shadow-purple-500/25 transform hover:scale-105 transition-all duration-300 disabled:opacity-50"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full blur opacity-75 group-hover:opacity-100 transition duration-300"></div>
                <div className="relative flex items-center gap-3">
                  <Wallet className="w-6 h-6" />
                  {isConnecting ? "Connecting..." : "Connect Wallet"}
                </div>
              </button>
            ) : (
              <div className="flex items-center gap-4 px-6 py-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-white font-mono">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </span>
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <button
                  onClick={() => disconnect()}
                  className="ml-2 px-3 py-1 text-xs bg-red-500/20 hover:bg-red-500/30 rounded-full transition-colors"
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Success Animation */}
        {showSuccess && reportedIncident && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-gradient-to-r from-green-400 to-emerald-500 p-8 rounded-3xl shadow-2xl transform animate-bounce">
              <div className="text-center text-white">
                <CheckCircle2 className="w-16 h-16 mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-2">Incident Reported!</h3>
                <p className="text-green-100">ID: #{reportedIncident.id}</p>
              </div>
            </div>
          </div>
        )}

        {/* Wallet Selection Modal */}
        {showWalletModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowWalletModal(false)}
          >
            <div
              className="bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-3xl shadow-2xl border border-white/20 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl">
                    <Wallet className="w-8 h-8 text-white" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  Connect Wallet
                </h3>
                <p className="text-gray-400">
                  Choose your preferred wallet to connect
                </p>
              </div>

              <div className="space-y-3 mb-6">
                {connectors.map((connector) => {
                  const getWalletInfo = (name: string) => {
                    if (name.toLowerCase().includes("argentx")) {
                      return {
                        icon: "⚡",
                        color: "from-orange-500 to-orange-600",
                      };
                    } else if (name.toLowerCase().includes("braavos")) {
                      return { icon: "🌟", color: "from-blue-500 to-blue-600" };
                    }
                    return { icon: "👛", color: "from-gray-500 to-gray-600" };
                  };

                  const walletInfo = getWalletInfo(connector.name);
                  const isAvailable = connector.available();

                  return (
                    <button
                      key={connector.id}
                      onClick={() => connectToWallet(connector)}
                      disabled={isConnecting || !isAvailable}
                      className="w-full flex items-center gap-4 p-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-all duration-300 group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div
                        className={`p-2 bg-gradient-to-r ${walletInfo.color} rounded-lg`}
                      >
                        <div className="text-white text-lg">
                          {walletInfo.icon}
                        </div>
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-white font-semibold">
                          {connector.name}
                        </div>
                        <div
                          className={`text-sm ${
                            isAvailable ? "text-green-400" : "text-red-400"
                          }`}
                        >
                          {isAvailable
                            ? "Ready to connect"
                            : "Please install this wallet"}
                        </div>
                      </div>
                      {isAvailable && (
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setShowWalletModal(false)}
                className="w-full py-3 px-6 bg-gray-600/50 hover:bg-gray-600/70 text-white rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Main Interface */}
        <div className="max-w-4xl mx-auto">
          {/* Tab Navigation */}
          <div className="flex justify-center mb-8">
            <div className="flex bg-white/10 backdrop-blur-md rounded-2xl p-2 border border-white/20">
              <button
                onClick={() => setActiveTab("report")}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                  activeTab === "report"
                    ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
                Report Incident
              </button>
              <button
                onClick={() => setActiveTab("search")}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                  activeTab === "search"
                    ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                <Search className="w-5 h-5" />
                Search Incident
              </button>
            </div>
          </div>

          {/* Report Tab */}
          {activeTab === "report" && (
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">
                  Report New Incident
                </h2>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Incident Description
                  </label>
                  <div className="relative">
                    <textarea
                      rows={6}
                      className="w-full p-4 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none backdrop-blur-sm transition-all duration-300"
                      placeholder="Provide a detailed description of the incident. Include what happened, when it occurred, and any relevant details..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                    <div className="absolute bottom-3 right-3 text-xs text-gray-400">
                      {description.length}/1000
                    </div>
                  </div>
                </div>

                {/* Separate Approve Button */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => approveMedTokens()}
                    disabled={isLoading || !address}
                    className="group relative px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl text-white font-semibold shadow-lg hover:shadow-blue-500/25 transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-xl blur opacity-0 group-hover:opacity-75 transition duration-300"></div>
                    <div className="relative flex items-center justify-center gap-2">
                      {isApprovePending ? (
                        <>
                          <Activity className="w-5 h-5 animate-spin" />
                          Approving...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-5 h-5" />
                          Approve MED Tokens
                        </>
                      )}
                    </div>
                  </button>

                  <button
                    onClick={handleReportIncident}
                    disabled={isLoading || !address || !description.trim()}
                    className="group relative px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl text-white font-semibold shadow-lg hover:shadow-orange-500/25 transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-red-400 rounded-xl blur opacity-0 group-hover:opacity-75 transition duration-300"></div>
                    <div className="relative flex items-center justify-center gap-2">
                      {isReportPending ? (
                        <>
                          <Activity className="w-5 h-5 animate-spin" />
                          Reporting...
                        </>
                      ) : (
                        <>
                          <Zap className="w-5 h-5" />
                          Report Incident
                        </>
                      )}
                    </div>
                  </button>
                </div>

                {/* Info Message */}
                <div className="p-4 bg-blue-500/20 border border-blue-500/30 rounded-xl backdrop-blur-sm">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-200">
                      <p className="font-medium mb-1">Two-Step Process:</p>
                      <ol className="list-decimal list-inside space-y-1 text-blue-300">
                        <li>
                          First, approve MED tokens (0.01 MED) for the incident
                          contract
                        </li>
                        <li>Then, submit your incident report</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Report Display */}
              {reportedIncident && !showSuccess && (
                <div className="mt-8 p-6 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-2xl backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <CheckCircle2 className="w-6 h-6 text-green-400" />
                    <h3 className="text-lg font-semibold text-green-400">
                      Successfully Reported
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-gray-300">
                      <Hash className="w-4 h-4 text-green-400" />
                      <span className="font-medium">ID:</span>
                      <span className="font-mono text-green-400">
                        #{reportedIncident.id}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <Clock className="w-4 h-4 text-green-400" />
                      <span className="font-medium">Time:</span>
                      <span className="text-green-400">
                        {reportedIncident.timestamp}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300 md:col-span-2">
                      <User className="w-4 h-4 text-green-400" />
                      <span className="font-medium">Reporter:</span>
                      <span className="font-mono text-green-400">
                        {formatAddress(reportedIncident.reportedBy)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Search Tab */}
          {activeTab === "search" && (
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl">
                  <Search className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">
                  Search Incidents
                </h2>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Incident ID
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="number"
                      className="flex-1 p-4 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm transition-all duration-300"
                      placeholder="Enter incident ID (e.g., 1, 2, 3...)"
                      value={incidentId}
                      onChange={(e) => setIncidentId(e.target.value)}
                    />
                    <button
                      onClick={handleFetchIncident}
                      disabled={isLoading || !address || !incidentId.trim()}
                      className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl text-white font-semibold shadow-lg hover:shadow-blue-500/25 transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      {isLoading ? (
                        <Activity className="w-6 h-6 animate-spin" />
                      ) : (
                        <Search className="w-6 h-6" />
                      )}
                    </button>
                  </div>
                </div>

                {fetchedIncident && (
                  <div className="p-6 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-2xl backdrop-blur-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <AlertCircle className="w-6 h-6 text-blue-400" />
                      <h3 className="text-lg font-semibold text-blue-400">
                        Incident Details
                      </h3>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-gray-300">
                        <Hash className="w-4 h-4 text-blue-400" />
                        <span className="font-medium">ID:</span>
                        <span className="font-mono text-blue-400">
                          #{fetchedIncident.id}
                        </span>
                      </div>
                      <div className="text-gray-300">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-4 h-4 text-blue-400" />
                          <span className="font-medium">Description:</span>
                        </div>
                        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                          <p className="text-white leading-relaxed">
                            {fetchedIncident.description}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-2 text-gray-300">
                          <User className="w-4 h-4 text-blue-400" />
                          <span className="font-medium">Reporter:</span>
                          <span className="font-mono text-blue-400 text-sm">
                            {formatAddress(fetchedIncident.reporter)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-300">
                          <Clock className="w-4 h-4 text-blue-400" />
                          <span className="font-medium">Time:</span>
                          <span className="text-blue-400">
                            {fetchedIncident.timestamp}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-16 text-gray-400">
          <p className="text-sm">
            Powered by Starknet Blockchain • Secure • Transparent • Immutable
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
