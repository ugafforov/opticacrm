import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Trash2, Pencil } from "lucide-react";

interface TableActionsProps {
  onEdit: () => void;
  onDelete: () => void;
  editTooltip?: string;
  deleteTooltip?: string;
}

export const TableActions = ({ 
  onEdit, 
  onDelete, 
  editTooltip = "Edit", 
  deleteTooltip = "Delete" 
}: TableActionsProps) => {
  return (
    <TooltipProvider>
      <div className="flex gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onEdit}
              className="hover:bg-primary/10 hover:text-primary transition-colors"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{editTooltip}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{deleteTooltip}</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};
