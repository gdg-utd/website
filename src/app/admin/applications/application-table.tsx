"use client";

export type StaffApplicationRow = {
  id: number;
  applicantName: string;
  applicantEmail: string;
  openingTitle: string;
  submittedLabel: string;
  decisionKey: string;
  decisionLabel: string;
};

type ApplicationTableProps = {
  applications: StaffApplicationRow[];
  onOpenApplication: (id: number) => void;
};

export function ApplicationTable({ applications, onOpenApplication }: ApplicationTableProps) {
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Applicant</th>
            <th>Position</th>
            <th>Submitted</th>
            <th>Decision</th>
            <th><span className="sr-only">Open</span></th>
          </tr>
        </thead>
        <tbody>
          {applications.map((application) => (
            <tr
              className="admin-application-row"
              key={application.id}
              onClick={() => onOpenApplication(application.id)}
              onKeyDown={(event) => {
                if (event.target !== event.currentTarget) return;
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onOpenApplication(application.id);
                }
              }}
              tabIndex={0}
            >
              <td>
                <strong>{application.applicantName}</strong>
                <span>{application.applicantEmail}</span>
              </td>
              <td>{application.openingTitle}</td>
              <td>{application.submittedLabel} CT</td>
              <td>
                <span className={`admin-decision admin-decision-${application.decisionKey}`}>
                  {application.decisionLabel}
                </span>
              </td>
              <td>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpenApplication(application.id);
                  }}
                >
                  Review <span aria-hidden="true">→</span>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
