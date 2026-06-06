import { WorkflowContext } from "./workflow-context";
import { WorkflowStep } from "./workflow-step";

export class WorkflowRunner {

  async run(
    steps: WorkflowStep[],
    context: WorkflowContext
  ): Promise<WorkflowContext> {

    let current = context;

    for (const step of steps) {
      current = await step.execute(current);
    }

    return current;
  }
}