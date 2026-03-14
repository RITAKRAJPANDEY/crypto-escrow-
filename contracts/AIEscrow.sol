// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title AI-controlled multi-milestone escrow contract
/// @notice Holds funds from a client and distributes them across milestones based on AI verification
contract AIEscrow {
    address public client;
    address public freelancer;
    address public projectPlannerAI;
    address public proofCheckerAI;

    uint256 public totalDeposited;
    uint256 public totalMilestones;
    bool public resolved;

    enum MilestoneStatus { PENDING, SUBMITTED, APPROVED, REJECTED, PAID, REFUNDED }

    struct Milestone {
        uint256 id;
        string description;
        uint256 targetAmount;
        uint256 releasePercentage; // 0-100
        uint256 releasedAmount;
        MilestoneStatus status;
        string proofHash; // IPFS hash or proof identifier
        uint256 createdAt;
        uint256 submittedAt;
        uint256 verifiedAt;
    }

    struct ProjectBreakdown {
        string projectDescription;
        uint256 totalBudget;
        uint256 numberOfMilestones;
        bool confirmed;
    }

    ProjectBreakdown public project;
    mapping(uint256 => Milestone) public milestones;

    event ProjectCreated(string description, uint256 totalBudget);
    event EscrowCreated(address indexed client, address indexed freelancer, uint256 amount);
    event MilestoneCreated(uint256 indexed milestoneId, uint256 amount, string description);
    event ProofSubmitted(uint256 indexed milestoneId, string proofHash);
    event MilestoneApproved(uint256 indexed milestoneId, uint256 releasePercentage, uint256 amountReleased);
    event MilestoneRejected(uint256 indexed milestoneId);
    event MilestoneRefunded(uint256 indexed milestoneId, uint256 amount);
    event ClientRefundRequested(uint256 amount);
    event FundsRefundedToClient(uint256 amount);

    modifier onlyClient() {
        require(msg.sender == client, "Only client can call this");
        _;
    }

    modifier onlyFreelancer() {
        require(msg.sender == freelancer, "Only freelancer can call this");
        _;
    }

    modifier onlyProofChecker() {
        require(msg.sender == proofCheckerAI, "Only proof checker AI can call this");
        _;
    }

    modifier onlyProjectPlanner() {
        require(msg.sender == projectPlannerAI, "Only project planner AI can call this");
        _;
    }

    constructor(
        address _freelancer,
        address _projectPlannerAI,
        address _proofCheckerAI
    ) payable {
        require(_freelancer != address(0), "Freelancer address is required");
        require(_projectPlannerAI != address(0), "Project planner AI address is required");
        require(_proofCheckerAI != address(0), "Proof checker AI address is required");
        require(msg.value > 0, "Must deposit funds");

        client = msg.sender;
        freelancer = _freelancer;
        projectPlannerAI = _projectPlannerAI;
        proofCheckerAI = _proofCheckerAI;
        totalDeposited = msg.value;

        emit EscrowCreated(client, freelancer, msg.value);
    }

    /// @notice Create project breakdown (called by Project Planner AI)
    /// @param _projectDescription Initial project description from client
    /// @param _totalBudget Total project budget
    /// @param _numberOfMilestones Number of milestones to create
    function createProjectBreakdown(
        string memory _projectDescription,
        uint256 _totalBudget,
        uint256 _numberOfMilestones
    ) external onlyProjectPlanner {
        require(_totalBudget <= totalDeposited, "Budget exceeds deposited amount");
        require(_numberOfMilestones > 0, "At least one milestone required");

        project = ProjectBreakdown({
            projectDescription: _projectDescription,
            totalBudget: _totalBudget,
            numberOfMilestones: _numberOfMilestones,
            confirmed: false
        });

        emit ProjectCreated(_projectDescription, _totalBudget);
    }

    /// @notice Client confirms the project breakdown
    function confirmProjectBreakdown() external onlyClient {
        require(bytes(project.projectDescription).length > 0, "No project breakdown created");
        project.confirmed = true;
    }

    /// @notice Create a milestone (called by Project Planner AI after project confirmation)
    /// @param _milestoneId Unique milestone ID
    /// @param _description Milestone description
    /// @param _targetAmount Target payment for this milestone
    function createMilestone(
        uint256 _milestoneId,
        string memory _description,
        uint256 _targetAmount
    ) external onlyProjectPlanner {
        require(project.confirmed, "Project breakdown must be confirmed first");
        require(_targetAmount > 0, "Milestone amount must be greater than 0");
        require(milestones[_milestoneId].id == 0, "Milestone already exists");

        milestones[_milestoneId] = Milestone({
            id: _milestoneId,
            description: _description,
            targetAmount: _targetAmount,
            releasePercentage: 0,
            releasedAmount: 0,
            status: MilestoneStatus.PENDING,
            proofHash: "",
            createdAt: block.timestamp,
            submittedAt: 0,
            verifiedAt: 0
        });

        totalMilestones++;
        emit MilestoneCreated(_milestoneId, _targetAmount, _description);
    }

    /// @notice Freelancer submits proof for a milestone
    /// @param _milestoneId Milestone ID
    /// @param _proofHash IPFS hash or proof identifier
    function submitProof(
        uint256 _milestoneId,
        string memory _proofHash
    ) external onlyFreelancer {
        require(milestones[_milestoneId].id != 0, "Milestone does not exist");
        require(milestones[_milestoneId].status == MilestoneStatus.PENDING, "Milestone not in pending status");

        milestones[_milestoneId].proofHash = _proofHash;
        milestones[_milestoneId].status = MilestoneStatus.SUBMITTED;
        milestones[_milestoneId].submittedAt = block.timestamp;

        emit ProofSubmitted(_milestoneId, _proofHash);
    }

    /// @notice Proof Checker AI approves milestone and releases payment
    /// @param _milestoneId Milestone ID
    /// @param _releasePercentage Percentage of milestone fund to release (0-100)
    function approveMilestone(
        uint256 _milestoneId,
        uint256 _releasePercentage
    ) external onlyProofChecker {
        require(milestones[_milestoneId].id != 0, "Milestone does not exist");
        require(milestones[_milestoneId].status == MilestoneStatus.SUBMITTED, "Milestone not submitted");
        require(_releasePercentage <= 100, "Release percentage must be 0-100");

        Milestone storage milestone = milestones[_milestoneId];
        uint256 amountToRelease = (milestone.targetAmount * _releasePercentage) / 100;

        require(address(this).balance >= amountToRelease, "Insufficient contract balance");

        milestone.releasePercentage = _releasePercentage;
        milestone.releasedAmount = amountToRelease;
        milestone.status = MilestoneStatus.APPROVED;
        milestone.verifiedAt = block.timestamp;

        // Transfer payment to freelancer
        (bool sent, ) = freelancer.call{value: amountToRelease}("");
        require(sent, "Transfer to freelancer failed");

        milestone.status = MilestoneStatus.PAID;
        emit MilestoneApproved(_milestoneId, _releasePercentage, amountToRelease);
    }

    /// @notice Proof Checker AI rejects milestone (proof doesn't meet standards)
    /// @param _milestoneId Milestone ID
    function rejectMilestone(uint256 _milestoneId) external onlyProofChecker {
        require(milestones[_milestoneId].id != 0, "Milestone does not exist");
        require(milestones[_milestoneId].status == MilestoneStatus.SUBMITTED, "Milestone not submitted");

        milestones[_milestoneId].status = MilestoneStatus.REJECTED;
        milestones[_milestoneId].proofHash = "";
        milestones[_milestoneId].submittedAt = 0;

        emit MilestoneRejected(_milestoneId);
    }

    /// @notice Refund milestone funds back to contract (when milestone is rejected and parties agree)
    /// @param _milestoneId Milestone ID
    function refundMilestone(uint256 _milestoneId) external {
        require(milestones[_milestoneId].id != 0, "Milestone does not exist");
        require(
            milestones[_milestoneId].status == MilestoneStatus.REJECTED ||
            milestones[_milestoneId].status == MilestoneStatus.PENDING,
            "Cannot refund this milestone"
        );

        milestones[_milestoneId].status = MilestoneStatus.REFUNDED;
        emit MilestoneRefunded(_milestoneId, milestones[_milestoneId].targetAmount);
    }

    /// @notice Get remaining unspent funds for a milestone
    /// @param _milestoneId Milestone ID
    /// @return Remaining amount for this milestone
    function getMilestoneRemaining(uint256 _milestoneId) external view returns (uint256) {
        require(milestones[_milestoneId].id != 0, "Milestone does not exist");
        Milestone memory milestone = milestones[_milestoneId];
        return milestone.targetAmount - milestone.releasedAmount;
    }

    /// @notice Get total leftover amount in contract
    /// @return Total remaining balance
    function getTotalRemaining() external view returns (uint256) {
        return address(this).balance;
    }

    /// @notice Client requests refund for unspent funds (both parties must agree)
    /// @dev In production, implement a two-step confirmation (client + freelancer signatures)
    function requestRefund() external onlyClient {
        uint256 remaining = address(this).balance;
        require(remaining > 0, "No funds to refund");

        emit ClientRefundRequested(remaining);
    }

    /// @notice Refund leftover funds to both parties based on agreement
    /// @param _clientRefundAmount Amount to refund to client
    /// @param _freelancerRefundAmount Amount to refund to freelancer
    function refundParties(uint256 _clientRefundAmount, uint256 _freelancerRefundAmount) external {
        require(msg.sender == client || msg.sender == freelancer, "Only client or freelancer can call");
        uint256 totalRefund = _clientRefundAmount + _freelancerRefundAmount;
        require(totalRefund <= address(this).balance, "Insufficient balance");

        if (_clientRefundAmount > 0) {
            (bool sentClient, ) = client.call{value: _clientRefundAmount}("");
            require(sentClient, "Transfer to client failed");
        }

        if (_freelancerRefundAmount > 0) {
            (bool sentFreelancer, ) = freelancer.call{value: _freelancerRefundAmount}("");
            require(sentFreelancer, "Transfer to freelancer failed");
        }

        emit FundsRefundedToClient(_clientRefundAmount);
    }

    /// @notice Get milestone details
    /// @param _milestoneId Milestone ID
    /// @return Milestone struct
    function getMilestone(uint256 _milestoneId) external view returns (Milestone memory) {
        require(milestones[_milestoneId].id != 0, "Milestone does not exist");
        return milestones[_milestoneId];
    }

    /// @notice Get contract balance
    /// @return Current ETH balance
    function contractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}

