import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class VehicleValuation {
  @PrimaryColumn({ length: 7 })
  vrm: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  lowestValue: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  highestValue: number;

  get midpointValue(): number {
    return (this.highestValue + this.lowestValue) / 2;
  }

  @Column({ type: 'text', nullable: true})
  provider?: string;
}
