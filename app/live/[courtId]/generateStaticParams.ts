export default function generateStaticParams() {
  return ["court1", "court2", "court3", "court4", "court5"].map((courtId) => ({
    courtId,
  }));
}
