using NUnit.Framework;
using OneMoreMerge.Core;

namespace OneMoreMerge.Tests
{
    public class RngTests
    {
        [Test]
        public void SameSeedGivesSameSequence()
        {
            var a = new Rng(12345u);
            var b = new Rng(12345u);
            for (int i = 0; i < 20; i++) Assert.AreEqual(a.Next(), b.Next());
        }

        [Test]
        public void IntStaysInRange()
        {
            var r = new Rng(7u);
            for (int i = 0; i < 200; i++)
            {
                int v = r.Int(5);
                Assert.That(v, Is.InRange(0, 4));
            }
        }
    }
}
