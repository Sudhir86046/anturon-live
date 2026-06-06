import { WorkflowContext } from "./workflow-context";

export interface WorkflowStep {
  execute(
    context: WorkflowContext
  ): Promise<WorkflowContext>;
}