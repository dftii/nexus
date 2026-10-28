interface SrDataTableProps {
  caption: string;
  columns: readonly string[];
  /** Pre-formatted cell values; each row has one entry per column. */
  rows: readonly (readonly string[])[];
}

/**
 * Visually hidden table that mirrors a chart's data so screen-reader users
 * get the actual numbers. Meant to sit next to the chart it describes.
 */
export function SrDataTable({ caption, columns, rows }: SrDataTableProps) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column} scope="col">
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row[0]}>
            {row.map((cell, index) => (
              <td key={columns[index]}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
