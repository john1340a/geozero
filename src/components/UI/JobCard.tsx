import { Card, CardHeader, CardBody, Chip, Button, Link } from "@heroui/react";
import type { JobOffer } from "../../types/job";

interface JobCardProps {
  job: JobOffer;
  isSelected?: boolean;
  onSelect: () => void;
}

export const JobCard = ({ job, isSelected, onSelect }: JobCardProps) => {
  return (
    <Card 
      isPressable
      onPress={onSelect}
      className={`w-full mb-3 border-none transition-all duration-200 ${isSelected ? 'bg-primary/10 ring-2 ring-primary' : 'bg-content1 hover:bg-content2'}`}
      shadow="sm"
    >
      <CardHeader className="flex justify-between items-start pb-0">
        <div className="flex flex-col gap-1 text-left">
          <h3 className="text-small font-bold leading-tight">{job.title}</h3>
          <p className="text-tiny text-default-500 uppercase">{job.city} ({job.department})</p>
        </div>
        <Chip 
            size="sm" 
            variant="flat" 
            color={
                job.type.includes("Stage") ? "success" : 
                job.type.includes("CDD") ? "warning" : 
                job.type.includes("CDI") ? "danger" : "default"
            }
        >
          {job.type}
        </Chip>
      </CardHeader>
      <CardBody className="pt-2">
        <div className="text-tiny text-default-500 line-clamp-2" dangerouslySetInnerHTML={{ __html: job.description }}></div>
        <div className="mt-2 flex justify-end">
            <Button 
                as={Link}
                href={job.link} 
                target="_blank" 
                size="sm" 
                variant="light" 
                color="primary"
                showAnchorIcon
            >
                Voir l'offre
            </Button>
        </div>
      </CardBody>
    </Card>
  );
};
